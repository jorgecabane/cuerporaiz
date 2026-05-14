import { NextResponse } from "next/server";
import { processWebhookUseCase } from "@/lib/application/checkout";

export async function handleMercadopagoWebhookRequest(request: Request): Promise<NextResponse> {
  try {
    const bodyRaw = await request.text();
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    const result = await processWebhookUseCase({ bodyRaw, xSignature, xRequestId });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    console.error("[webhook mercadopago]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
