import { redirect } from "next/navigation";

/**
 * Back URL de MercadoPago: pago pendiente (ej. efectivo en punto físico).
 * El webhook actualizará la orden cuando MP confirme.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const externalReference = searchParams.get("external_reference");
  const centerId = searchParams.get("centerId");

  const params = new URLSearchParams();
  if (externalReference) params.set("order", externalReference);
  if (centerId) params.set("centerId", centerId);
  params.set("result", "pending");

  redirect(`/checkout/gracias?${params.toString()}`);
}
