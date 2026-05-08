import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildClassReminderEmail } from "@/lib/email";
import { shouldSendEmail } from "@/lib/application/check-email-preference";
import { getEmailBranding } from "@/lib/email/branding";

const REMINDER_HOURS_BEFORE = 2;
/** Ventana de búsqueda: corremos cada hora; cubrimos 1h alrededor del target. */
const WINDOW_MINUTES = 30;

/**
 * Recordatorio 2h antes de cada clase activa con reservas confirmadas.
 * Idempotencia: la ventana de 1h alrededor del target evita doble envío
 * mientras el cron corra cada hora exacta.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const target = new Date(now.getTime() + REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
  const from = new Date(target.getTime() - WINDOW_MINUTES * 60 * 1000);
  const to = new Date(target.getTime() + WINDOW_MINUTES * 60 * 1000);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
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
  const brandingCache = new Map<string, Awaited<ReturnType<typeof getEmailBranding>>>();

  for (const r of reservations) {
    const canSend = await shouldSendEmail(r.userId, r.liveClass.centerId, "classReminder");
    if (!canSend) continue;

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

  return NextResponse.json({ ok: true, sent, total: reservations.length });
}
