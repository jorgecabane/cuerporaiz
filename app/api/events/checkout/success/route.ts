import { redirect } from "next/navigation";
import { eventTicketRepository } from "@/lib/adapters/db";

/**
 * Back URL de MercadoPago: pago aprobado de un EventTicket.
 * - Compra guest (ticket con `claimToken`): redirige a la confirmación pública
 *   accesible por token, donde puede reclamar su cuenta.
 * - Compra autenticada: redirige a /checkout-evento/gracias.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticketId");
  const externalReference = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");

  if (ticketId) {
    const ticket = await eventTicketRepository.findById(ticketId);
    if (ticket?.claimToken) {
      redirect(`/eventos/confirmacion/${ticket.id}?token=${ticket.claimToken}`);
    }
  }

  const params = new URLSearchParams();
  if (ticketId) params.set("ticketId", ticketId);
  if (externalReference) params.set("ref", externalReference);
  if (paymentId) params.set("paymentId", paymentId);
  params.set("result", "success");

  redirect(`/checkout-evento/gracias?${params.toString()}`);
}
