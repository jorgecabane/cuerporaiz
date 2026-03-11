import { NextResponse } from "next/server";
import { processWebhookUseCase } from "@/lib/application/checkout";

/**
 * Webhook de MercadoPago por centro (multi-tenant).
 * URL configurada en MP por cada centro: .../api/webhooks/mercadopago/[centerId]
 * Valida firma x-signature, idempotencia por x-request-id y re-consulta el pago en la API de MP.
 * Nunca se almacenan ni manejan datos de tarjeta.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const { centerId } = await params;
    if (!centerId) {
      return NextResponse.json({ error: "centerId required" }, { status: 400 });
    }

    const bodyRaw = await request.text();
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    const result = await processWebhookUseCase({
      centerId,
      bodyRaw,
      xSignature,
      xRequestId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    console.error("[webhook mercadopago]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
