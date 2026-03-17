import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckoutUseCase } from "@/lib/application/checkout";
import { createCheckoutBodySchema } from "@/lib/dto/checkout-dto";
import { centerRepository } from "@/lib/adapters/db";

function getBaseUrl(request: Request): string {
  const u = new URL(request.url);
  const xfProto = request.headers.get("x-forwarded-proto");
  const xfHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const proto = (xfProto ?? u.protocol.replace(":", "") ?? "http").split(",")[0].trim();
  const resolvedHost = (xfHost ?? host ?? u.host).split(",")[0].trim();
  return (
    `${proto}://${resolvedHost}` ||
    request.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  );
}

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

    const baseUrl = getBaseUrl(request);

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
