/**
 * Recordatorio ~2 h antes de cada evento online, colgado del cron
 * class-reminder (Vercel Hobby no admite más crons). Dedupe con
 * EventAttendee.reminderSentAt y claim atómico, igual que las reservas.
 */
import { prisma } from "@/lib/adapters/db/prisma";
import type { EventAttendee } from "@/lib/domain/event";
import { sendEmailSafe } from "./send-email";
import { shouldSendEmail } from "./check-email-preference";
import { getEmailBranding } from "@/lib/email/branding";
import { buildEventOnlineReminderEmail, entryLinksFor } from "@/lib/email/event-online";

type Buyer = { id: string; email: string; name: string | null };
export type ReminderRow = EventAttendee & { buyer: Buyer; eventId: string };
export type ReminderGroup = {
  toEmail: string;
  userName: string | null;
  isBuyer: boolean;
  userId: string;
  eventId: string;
  attendees: EventAttendee[];
};

/** Un correo por destinatario y evento: el comprador recibe los cupos sin correo propio; cada asistente con correo, el suyo. */
export function groupReminderRecipients(rows: ReminderRow[]): ReminderGroup[] {
  const groups = new Map<string, ReminderGroup>();
  for (const r of rows) {
    const own = r.email && r.email !== r.buyer.email ? r.email : null;
    const toEmail = own ?? r.buyer.email;
    const key = `${r.eventId}:${toEmail}`;
    const group = groups.get(key) ?? {
      toEmail,
      userName: own ? r.name : r.buyer.name,
      isBuyer: !own,
      userId: r.buyer.id,
      eventId: r.eventId,
      attendees: [],
    };
    group.attendees.push(r);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export async function sendEventOnlineReminders(now: Date): Promise<{ sent: number }> {
  const from = new Date(now.getTime() + 60 * 60 * 1000);
  const to = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const candidates = await prisma.eventAttendee.findMany({
    where: {
      reminderSentAt: null,
      revokedAt: null,
      ticket: { status: "PAID", event: { isOnline: true, status: "PUBLISHED", startsAt: { gte: from, lte: to } } },
    },
    include: { ticket: { include: { user: { select: { id: true, email: true, name: true } }, event: true } } },
  });
  if (candidates.length === 0) return { sent: 0 };

  // Claim atómico: sólo seguimos con los que este disparo logró marcar.
  const claimed = await prisma.eventAttendee.updateManyAndReturn({
    where: { id: { in: candidates.map((c) => c.id) }, reminderSentAt: null },
    data: { reminderSentAt: now },
    select: { id: true },
  });
  const claimedIds = new Set(claimed.map((c) => c.id));
  const rows = candidates
    .filter((c) => claimedIds.has(c.id))
    .map((c) => ({ ...c, buyer: c.ticket.user, eventId: c.ticket.eventId }));
  const events = new Map(candidates.map((c) => [c.ticket.eventId, c.ticket.event]));

  let sent = 0;
  for (const group of groupReminderRecipients(rows)) {
    const event = events.get(group.eventId)!;
    if (group.isBuyer && !(await shouldSendEmail(group.userId, event.centerId, "classReminder"))) continue;
    const branding = await getEmailBranding(event.centerId);
    await sendEmailSafe(
      buildEventOnlineReminderEmail({
        toEmail: group.toEmail,
        userName: group.userName,
        eventTitle: event.title,
        startsAt: event.startsAt,
        entryLinks: entryLinksFor(group.attendees, group.isBuyer ? group.toEmail : ""),
        branding,
      })
    );
    sent++;
  }
  return { sent };
}
