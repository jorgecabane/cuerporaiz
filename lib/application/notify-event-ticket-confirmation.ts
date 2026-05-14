/**
 * Helper compartido: dispara el correo de confirmación de entrada a un evento.
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
  type EventTicketConfirmationKind,
} from "@/lib/email/event";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { eventRepository, userRepository } from "@/lib/adapters/db";

export async function notifyEventTicketConfirmation(input: {
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
}): Promise<void> {
  const [event, user, branding] = await Promise.all([
    eventRepository.findById(input.eventId),
    userRepository.findById(input.userId),
    getEmailBranding(input.centerId),
  ]);
  if (!event || !user) return;

  sendEmailSafe(
    buildEventTicketConfirmationEmail({
      toEmail: user.email,
      userName: user.name ?? user.email.split("@")[0],
      eventTitle: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location ?? branding.contactAddress,
      amountCents: input.amountCents,
      currency: input.currency,
      quantity: input.quantity ?? 1,
      kind: input.kind ?? "purchase",
      addedQuantity: input.addedQuantity,
      eventUrl: `${getBaseUrl()}/eventos/${event.id}`,
      preferencesUrl: `${getBaseUrl()}/panel/mi-perfil?tab=correos`,
      branding,
    })
  );
}
