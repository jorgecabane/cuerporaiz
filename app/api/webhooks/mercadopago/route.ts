import { NextResponse } from "next/server";
import { processWebhookUseCase } from "@/lib/application/checkout";

/**
 * Webhook genérico de MercadoPago. Una sola URL para todos los centros: el centro
 * se resuelve internamente vía `user_id` del cuerpo del webhook (que matchea con
 * el `mpUserId` que guardamos al conectar OAuth).
 *
 * Configurar en el panel de MP → Webhooks como `https://<dominio>/api/webhooks/mercadopago`.
 * Esa URL queda igual para todas las preferencias y suscripciones.
 *
 * La firma `x-signature` se valida con `MP_WEBHOOK_SECRET` (env), que es la
 * clave secreta generada por MercadoPago al guardar la configuración del webhook.
 */
export async function POST(request: Request) {
  try {
    const bodyRaw = await request.text();
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    const result = await processWebhookUseCase({
      bodyRaw,
      xSignature,
      xRequestId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    console.error("[webhook mercadopago]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
