/**
 * Helper compartido: dispara el correo de confirmación de entrada a un evento
 * y el aviso de nueva inscripción al admin del centro (email de contacto).
 * En eventos online asegura un cupo con link personal por entrada, los lista en
 * la confirmación y, en la compra inicial, manda su link a cada asistente con correo.
 * Llamado desde:
 *   - event-checkout (eventos gratis activan PAID inmediatamente; re-compra
 *     free incrementa quantity)
 *   - admin/events/[id]/manual-ticket (admin emite ticket manual)
 *   - panel/pagos/approveEventTicketManually (admin aprueba transferencia)
 *   - webhook MP (pago aprobado de EventTicket inicial o addition)
 */
import { sendEmailSafe } from "./send-email";
import {
  buildEventTicketConfirmationEmail,
  buildEventRegistrationNoticeToAdminEmail,
  type EventTicketConfirmationKind,
} from "@/lib/email/event";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { runInBackground } from "@/lib/utils/run-after-response";
import { eventRepository, eventTicketRepository, userRepository } from "@/lib/adapters/db";
import type { Event, EventAttendee, EventTicket } from "@/lib/domain/event";
import { ensureEventAttendees } from "./ensure-event-attendees";
import { buildEventAttendeeLinkEmail, entryLinksFor } from "@/lib/email/event-online";
import { eventEntryUrl } from "@/lib/utils/event-entry-url";

/** Los callers no esperan esta promesa: el trabajo se registra en after() al llamarla. */
export function notifyEventTicketConfirmation(input: {
  eventId: string;
  userId: string;
  centerId: string;
  amountCents: number;
  currency: string;
  /** Total de cupos del ticket después de esta operación. Default 1. */
  quantity?: number;
  /** purchase = compra inicial. addition = re-compra. Default purchase. */
  kind?: EventTicketConfirmationKind;
  /** Cupos agregados (sólo relevante con kind="addition"). */
  addedQuantity?: number;
  /** Avisar al admin del centro (email de contacto). false cuando la acción la hizo el admin. Default true. */
  notifyAdmin?: boolean;
}): Promise<void> {
  return runInBackground(() => sendConfirmation(input));
}

async function sendConfirmation(input: Parameters<typeof notifyEventTicketConfirmation>[0]): Promise<void> {
  const [event, user, branding] = await Promise.all([
    eventRepository.findById(input.eventId),
    userRepository.findById(input.userId),
    getEmailBranding(input.centerId),
  ]);
  if (!event || !user) return;
  const { ticket, attendees } = await loadOnlineAttendees(event, user.id);
  const kind = input.kind ?? "purchase";

  await sendEmailSafe(
    buildEventTicketConfirmationEmail({
      toEmail: user.email,
      userName: user.name ?? user.email.split("@")[0],
      eventTitle: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location ?? (event.isOnline ? "Online" : branding.contactAddress),
      amountCents: input.amountCents,
      currency: input.currency,
      quantity: input.quantity ?? 1,
      kind: input.kind ?? "purchase",
      addedQuantity: input.addedQuantity,
      eventUrl: `${getBaseUrl()}/eventos/${event.id}`,
      preferencesUrl: `${getBaseUrl()}/panel/mi-perfil?tab=correos`,
      entryLinks: attendees.length ? entryLinksFor(attendees, user.email) : undefined,
      branding,
    })
  );

  // Compra inicial: cada asistente con correo propio recibe su link directo.
  if (kind === "purchase" && ticket && canEmailAttendees(ticket)) {
    const buyerName = user.name ?? user.email.split("@")[0];
    for (const a of directRecipients(attendees, user.email)) {
      await sendEmailSafe(
        buildEventAttendeeLinkEmail({
          toEmail: a.email!,
          attendeeName: a.name,
          buyerName,
          eventTitle: event.title,
          startsAt: event.startsAt,
          entryUrl: eventEntryUrl(a.token),
          branding,
        })
      );
    }
  }

  if (input.notifyAdmin === false || !branding.contactEmail) return;
  const paidSeats = await eventTicketRepository.countPaidByEventId(event.id);
  await sendEmailSafe(
    buildEventRegistrationNoticeToAdminEmail({
      toEmail: branding.contactEmail,
      eventTitle: event.title,
      startsAt: event.startsAt,
      buyerName: user.name ?? user.email.split("@")[0],
      buyerEmail: user.email,
      buyerPhone: user.phone,
      quantity: kind === "addition" ? (input.addedQuantity ?? 1) : (input.quantity ?? 1),
      kind,
      amountCents: input.amountCents,
      currency: input.currency,
      paidSeats,
      maxCapacity: event.maxCapacity,
      adminEventUrl: `${getBaseUrl()}/panel/eventos/${event.id}`,
      branding,
    })
  );
}

/** Tope de correos directos a asistentes por compra (anti-spam). */
const MAX_DIRECT_ATTENDEE_EMAILS = 10;

/**
 * Un guest con entrada gratis podría escribir correos arbitrarios y usar al
 * centro para mandarlos: en ese caso sólo el comprador recibe los links.
 */
function canEmailAttendees(ticket: EventTicket): boolean {
  return !(ticket.claimToken && ticket.amountCents === 0);
}

/** Asistentes con correo propio, sin repetidos, hasta el tope. */
function directRecipients(attendees: EventAttendee[], buyerEmail: string): EventAttendee[] {
  const seen = new Set<string>([buyerEmail]);
  return attendees
    .filter((a) => a.email && !seen.has(a.email) && seen.add(a.email))
    .slice(0, MAX_DIRECT_ATTENDEE_EMAILS);
}

/** Cupos con link personal del ticket; si falla, la confirmación sale igual sin links. */
async function loadOnlineAttendees(
  event: Event,
  userId: string
): Promise<{ ticket: EventTicket | null; attendees: EventAttendee[] }> {
  if (!event.isOnline) return { ticket: null, attendees: [] };
  const ticket = await eventTicketRepository.findByEventAndUser(event.id, userId).catch(() => null);
  if (!ticket) return { ticket: null, attendees: [] };
  try {
    return { ticket, attendees: await ensureEventAttendees(ticket, event) };
  } catch (err) {
    console.error("[notify-event-ticket] ensure attendees", err instanceof Error ? err.message : err);
    return { ticket, attendees: [] };
  }
}
