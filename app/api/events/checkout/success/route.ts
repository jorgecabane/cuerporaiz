import { redirect } from "next/navigation";

/**
 * Back URL de MercadoPago: pago aprobado de un EventTicket.
 * Redirige a /checkout-evento/gracias con el ticketId y el resultado.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticketId");
  const externalReference = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");

  const params = new URLSearchParams();
  if (ticketId) params.set("ticketId", ticketId);
  if (externalReference) params.set("ref", externalReference);
  if (paymentId) params.set("paymentId", paymentId);
  params.set("result", "success");

  redirect(`/checkout-evento/gracias?${params.toString()}`);
}
