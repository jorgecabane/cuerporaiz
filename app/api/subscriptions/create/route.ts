import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSubscriptionBodySchema } from "@/lib/dto/subscription-dto";
import { createSubscriptionCheckoutUseCase } from "@/lib/application/subscription-checkout";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = createSubscriptionBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const baseUrl = new URL(request.url).origin;

    const result = await createSubscriptionCheckoutUseCase({
      centerId: session.user.centerId,
      userId: session.user.id,
      planId: parsed.data.planId,
      baseUrl,
      payerEmail: session.user.email ?? "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ subscriptionUrl: result.subscriptionUrl });
  } catch (err) {
    console.error("[api/subscriptions/create]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
