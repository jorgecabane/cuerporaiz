import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelSubscriptionBodySchema } from "@/lib/dto/subscription-dto";
import { subscriptionRepository, mercadopagoConfigRepository } from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = cancelSubscriptionBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const subscription = await subscriptionRepository.findById(parsed.data.subscriptionId);
    if (!subscription || subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    const config = await mercadopagoConfigRepository.findByCenterId(subscription.centerId);
    if (!config?.enabled) {
      return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 400 });
    }

    const result = await mercadoPagoSubscriptionAdapter.cancelPreapproval({
      accessToken: config.accessToken,
      mpSubscriptionId: subscription.mpSubscriptionId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await subscriptionRepository.updateStatus(subscription.id, "CANCELLED");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/subscriptions/cancel]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
