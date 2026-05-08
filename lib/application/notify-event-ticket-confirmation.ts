/**
 * Helper compartido: dispara el correo de confirmación de entrada a un evento.
 * Llamado desde:
 *   - event-checkout (eventos gratis activan PAID inmediatamente)
 *   - admin/events/[id]/manual-ticket (admin emite ticket manual)
 *   - panel/pagos/approveEventTicketManually (admin aprueba transferencia)
 */
import { sendEmailSafe } from "./send-email";
import { buildEventTicketConfirmationEmail } from "@/lib/email/event";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { eventRepository, userRepository } from "@/lib/adapters/db";

export async function notifyEventTicketConfirmation(input: {
  eventId: string;
  userId: string;
  centerId: string;
  amountCents: number;
  currency: string;
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
      eventUrl: `${getBaseUrl()}/eventos/${event.id}`,
      preferencesUrl: `${getBaseUrl()}/panel/mi-perfil?tab=correos`,
      branding,
    })
  );
}
