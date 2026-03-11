import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

/**
 * Back URL de MercadoPago: pago aprobado.
 * Query: payment_id, status, external_reference, merchant_order_id, centerId.
 * Redirige a /checkout/gracias con el estado.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const externalReference = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("status");
  const centerId = searchParams.get("centerId");

  const params = new URLSearchParams();
  if (externalReference) params.set("order", externalReference);
  if (paymentId) params.set("payment_id", paymentId);
  if (status) params.set("status", status);
  if (centerId) params.set("centerId", centerId);
  params.set("result", "success");

  redirect(`/checkout/gracias?${params.toString()}`);
}
