import type { EventStatus, EventTicketStatus } from "./event";

/** Minutos antes del inicio en que el link personal empieza a redirigir. */
export const ENTRY_OPENS_MINUTES_BEFORE = 10;

export interface EventEntryInput {
  attendee: { revokedAt: Date | null } | null;
  ticketStatus: EventTicketStatus | null;
  event: {
    status: EventStatus;
    isOnline: boolean;
    meetingUrl: string | null;
    startsAt: Date;
    endsAt: Date;
  } | null;
  now: Date;
}

export type EventEntryDecision =
  | { kind: "invalid" }
  | { kind: "cancelled" }
  | { kind: "ended" }
  | { kind: "waiting"; opensAt: Date }
  | { kind: "enter"; meetingUrl: string };

/** Qué ve un link personal en este momento. Sin estado: lee siempre la fecha actual del evento. */
export function resolveEventEntry({ attendee, ticketStatus, event, now }: EventEntryInput): EventEntryDecision {
  if (!attendee || !event) return { kind: "invalid" };
  if (event.status === "CANCELLED") return { kind: "cancelled" };
  if (attendee.revokedAt || ticketStatus !== "PAID" || !event.isOnline || !event.meetingUrl) {
    return { kind: "invalid" };
  }
  if (now.getTime() > event.endsAt.getTime()) return { kind: "ended" };
  const opensAt = new Date(event.startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * 60_000);
  if (now.getTime() < opensAt.getTime()) return { kind: "waiting", opensAt };
  return { kind: "enter", meetingUrl: event.meetingUrl };
}
