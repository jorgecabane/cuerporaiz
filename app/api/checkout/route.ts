import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckoutUseCase, createPendingOrderForPlan } from "@/lib/application/checkout";
import { createCheckoutBodySchema } from "@/lib/dto/checkout-dto";
import { centerRepository } from "@/lib/adapters/db";
import { requestBaseUrl } from "@/lib/utils/request-base-url";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión para comprar" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createCheckoutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { planId, centerId: centerIdOrSlug, centerSlug } = parsed.data;
    const centerIdParam = centerIdOrSlug ?? centerSlug ?? session.user.centerId;
    const center = await centerRepository.findBySlug(centerIdParam)
      ?? await centerRepository.findById(centerIdParam);
    if (!center) {
      return NextResponse.json(
        { code: "CENTER_NOT_FOUND", message: "Centro no encontrado" },
        { status: 404 }
      );
    }

    const baseUrl = requestBaseUrl(request.headers, request.url);

    // Si el centro acepta transferencia para planes, creamos sólo la Order y
    // mandamos al selector inline. La preferencia MP se crea cuando la alumna
    // elige "Continuar a MercadoPago".
    const transferAllowed = center.bankTransferEnabled && center.bankTransferAcceptPlans;
    if (transferAllowed) {
      const orderRes = await createPendingOrderForPlan({
        centerId: center.id,
        userId: session.user.id,
        planId,
      });
      if (!orderRes.success) {
        return NextResponse.json(
          { code: "CHECKOUT_ERROR", message: orderRes.error },
          { status: 404 }
        );
      }
      return NextResponse.json({
        orderId: orderRes.orderId,
        redirectTo: `/checkout/${orderRes.orderId}`,
      });
    }

    const nameParts = (session.user.name ?? "").trim().split(/\s+/);
    const payerFirstName = nameParts[0] ?? undefined;
    const payerLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const result = await createCheckoutUseCase({
      centerId: center.id,
      userId: session.user.id,
      planId,
      baseUrl,
      payerEmail: session.user.email ?? undefined,
      payerFirstName: payerFirstName || undefined,
      payerLastName: payerLastName || undefined,
    });

    if (!result.success) {
      const status = result.error?.includes("no está configurado") ? 400 : 404;
      return NextResponse.json(
        { code: "CHECKOUT_ERROR", message: result.error },
        { status }
      );
    }

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      orderId: result.orderId,
    });
  } catch (err) {
    console.error("[checkout POST]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al crear el checkout" },
      { status: 500 }
    );
  }
}
