import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createEventCheckout } from "@/lib/application/event-checkout";

function getBaseUrl(request: Request): string {
  const u = new URL(request.url);
  const xfProto = request.headers.get("x-forwarded-proto");
  const xfHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const proto = (xfProto ?? u.protocol.replace(":", "") ?? "http").split(",")[0].trim();
  const resolvedHost = (xfHost ?? host ?? u.host).split(",")[0].trim();
  return `${proto}://${resolvedHost}`;
}

/**
 * POST /api/events/[id]/checkout — Iniciar checkout de evento para el usuario autenticado.
 * Responde con { checkoutUrl } para eventos de pago, o { ticket } para eventos gratuitos.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión para comprar entradas" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const baseUrl = getBaseUrl(request);

    const nameParts = (session.user.name ?? "").trim().split(/\s+/);
    const payerFirstName = nameParts[0] ?? undefined;
    const payerLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const result = await createEventCheckout({
      eventId: id,
      centerId: session.user.centerId,
      userId: session.user.id,
      baseUrl,
      payerEmail: session.user.email ?? undefined,
      payerFirstName: payerFirstName || undefined,
      payerLastName: payerLastName || undefined,
    });

    if (!result.success) {
      const statusByCode: Record<string, number> = {
        EVENT_NOT_FOUND: 404,
        EVENT_NOT_PUBLISHED: 404,
        EVENT_ENDED: 409,
        ALREADY_PURCHASED: 409,
        EVENT_FULL: 409,
        MP_NOT_CONFIGURED: 400,
        MP_PREFERENCE_FAILED: 502,
      };
      const status = statusByCode[result.code] ?? 500;
      return NextResponse.json({ code: result.code, message: result.message }, { status });
    }

    if (result.checkoutUrl) {
      return NextResponse.json({ checkoutUrl: result.checkoutUrl });
    }

    return NextResponse.json({ ticket: result.ticket });
  } catch (err) {
    console.error("[events checkout POST]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al procesar el checkout" },
      { status: 500 }
    );
  }
}
