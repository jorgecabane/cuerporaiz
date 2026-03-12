import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSubscriptionCheckoutUseCase } from "@/lib/application/subscription";
import { z } from "zod";
import { centerRepository } from "@/lib/adapters/db";

const subscribeBodySchema = z.object({
  planId: z.string().cuid(),
  centerId: z.string().min(1).optional(),
  centerSlug: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión para suscribirte" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = subscribeBodySchema.safeParse(body);
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

    const baseUrl =
      request.headers.get("origin")
      ?? process.env.NEXTAUTH_URL
      ?? process.env.AUTH_URL
      ?? "http://localhost:3000";

    const result = await createSubscriptionCheckoutUseCase({
      centerId: center.id,
      userId: session.user.id,
      planId,
      payerEmail: session.user.email ?? "",
      baseUrl,
    });

    if (!result.success) {
      const status = result.error?.includes("no está configurado") ? 400 : 404;
      return NextResponse.json(
        { code: "SUBSCRIBE_ERROR", message: result.error },
        { status }
      );
    }

    return NextResponse.json({
      redirectUrl: result.redirectUrl,
      subscriptionId: result.subscriptionId,
    });
  } catch (err) {
    console.error("[subscribe POST]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al crear la suscripción" },
      { status: 500 }
    );
  }
}
