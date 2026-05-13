import { NextResponse } from "next/server";
import { z } from "zod";
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

const checkoutBodySchema = z
  .object({
    quantity: z.number().int().min(1).max(50).optional(),
  })
  .optional();

/**
 * POST /api/events/[id]/checkout — Iniciar checkout de evento para el usuario autenticado.
 * Body opcional: `{ quantity?: number }` (1..50). Default 1.
 * Responde con { checkoutUrl } para eventos de pago, o { ticket } para eventos gratuitos.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let userId: string | undefined;
  let centerId: string | undefined;
  let quantity: number | undefined;
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión para comprar entradas" },
        { status: 401 }
      );
    }
    userId = session.user.id;
    centerId = session.user.centerId;

    let parsedBody: z.infer<typeof checkoutBodySchema> = undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await request.text();
      if (raw.trim()) {
        const json = JSON.parse(raw);
        const result = checkoutBodySchema.safeParse(json);
        if (!result.success) {
          return NextResponse.json(
            {
              code: "INVALID_QUANTITY",
              message: "La cantidad de cupos debe ser un entero entre 1 y 50",
            },
            { status: 400 }
          );
        }
        parsedBody = result.data;
      }
    }
    quantity = parsedBody?.quantity;

    const baseUrl = getBaseUrl(request);

    const nameParts = (session.user.name ?? "").trim().split(/\s+/);
    const payerFirstName = nameParts[0] ?? undefined;
    const payerLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const result = await createEventCheckout({
      eventId: id,
      centerId,
      userId,
      baseUrl,
      quantity,
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
        INVALID_QUANTITY: 400,
        MP_NOT_CONFIGURED: 400,
        MP_PREFERENCE_FAILED: 502,
      };
      const status = statusByCode[result.code] ?? 500;
      return NextResponse.json({ code: result.code, message: result.message }, { status });
    }

    if (result.redirectTo) {
      return NextResponse.json({ ticket: result.ticket, redirectTo: result.redirectTo });
    }
    if (result.checkoutUrl) {
      return NextResponse.json({ checkoutUrl: result.checkoutUrl });
    }

    return NextResponse.json({ ticket: result.ticket });
  } catch (err) {
    // Logging detallado: el error genérico "Error al procesar el checkout"
    // ahora sí queda con stack + contexto para diagnóstico (sin PII).
    console.error("[events checkout POST]", {
      eventId: id,
      userId,
      centerId,
      quantity,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      {
        code: "SERVER_ERROR",
        message: "Tuvimos un problema procesando el checkout. Intenta nuevamente.",
      },
      { status: 500 }
    );
  }
}
