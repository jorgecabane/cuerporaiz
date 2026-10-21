import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildClassReminderEmail } from "@/lib/email";
import { shouldSendEmail } from "@/lib/application/check-email-preference";
import { getEmailBranding } from "@/lib/email/branding";
import { sendEventOnlineReminders } from "@/lib/application/send-event-online-reminders";

const REMINDER_HOURS_BEFORE = 2;

/**
 * Recordatorio ~2h antes de cada clase.
 *
 * En Vercel Hobby los crons tienen precisión ±59 min y solo pueden correr
 * 1 vez por día. Para cubrir el día entero usamos múltiples entradas en
 * vercel.json (cada hora desde 06:00 hasta 22:00). Cada disparo cubre una
 * ventana de 2h adelante (1h–3h) y se apoya en `Reservation.reminderSentAt`
 * para evitar duplicados.
 *
 * También envía el recordatorio de eventos online con los links personales
 * (ver send-event-online-reminders).
 *
 * Lógica:
 *  1. Buscamos reservas CONFIRMED con clase en [now+1h, now+3h] y
 *     reminderSentAt = null.
 *  2. Para cada una, claim atómico vía updateMany (filtra reminderSentAt: null
 *     en la condición). Si dos crons se solapan, solo uno gana el claim.
 *  3. El que gana el claim manda el correo (si la pref del usuario lo permite).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 60 * 60 * 1000); // +1h
  const to = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3h

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      liveClass: { startsAt: { gte: from, lte: to }, status: "ACTIVE" },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      liveClass: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          durationMinutes: true,
          isOnline: true,
          meetingUrl: true,
          centerId: true,
        },
      },
    },
  });

  let sent = 0;
  let skippedByPref = 0;
  let raceLost = 0;
  const brandingCache = new Map<string, Awaited<ReturnType<typeof getEmailBranding>>>();

  for (const r of reservations) {
    // Claim atómico: marca reminderSentAt solo si sigue null. Si otro cron
    // ya la tomó (precisión ±59min), claimed.count === 0 y la salteamos.
    const claimed = await prisma.reservation.updateMany({
      where: { id: r.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) {
      raceLost++;
      continue;
    }

    const canSend = await shouldSendEmail(r.userId, r.liveClass.centerId, "classReminder");
    if (!canSend) {
      skippedByPref++;
      continue;
    }

    let branding = brandingCache.get(r.liveClass.centerId);
    if (!branding) {
      branding = await getEmailBranding(r.liveClass.centerId);
      brandingCache.set(r.liveClass.centerId, branding);
    }

    const endAt = new Date(r.liveClass.startsAt.getTime() + r.liveClass.durationMinutes * 60000);
    const location = r.liveClass.isOnline
      ? (r.liveClass.meetingUrl ?? "Por confirmar")
      : (branding.contactAddress ?? "Presencial");

    sendEmailSafe(buildClassReminderEmail({
      toEmail: r.user.email,
      userName: r.user.name ?? undefined,
      className: r.liveClass.title,
      startAt: r.liveClass.startsAt.toISOString(),
      endAt: endAt.toISOString(),
      location,
      hoursBefore: REMINDER_HOURS_BEFORE,
      branding,
    }));
    sent++;
  }

  const eventReminders = await sendEventOnlineReminders(now).catch((err) => {
    console.error("[class-reminder] event reminders", err instanceof Error ? err.message : err);
    return { sent: 0 };
  });

  return NextResponse.json({
    ok: true,
    sent,
    skippedByPref,
    raceLost,
    candidates: reservations.length,
    eventRemindersSent: eventReminders.sent,
  });
}
