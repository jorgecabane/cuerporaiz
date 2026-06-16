import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createEventCheckout } from "@/lib/application/event-checkout";
import { resolveGuestUser } from "@/lib/application/resolve-guest-user";
import { allowGuestCheckout } from "@/lib/application/guest-checkout-rate-limit";
import { guestCheckoutBodySchema } from "@/lib/dto/guest-checkout-dto";
import { centerRepository } from "@/lib/adapters/db";

function getBaseUrl(request: Request): string {
  const u = new URL(request.url);
  const xfProto = request.headers.get("x-forwarded-proto");
  const xfHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const proto = (xfProto ?? u.protocol.replace(":", "") ?? "http").split(",")[0].trim();
  const resolvedHost = (xfHost ?? host ?? u.host).split(",")[0].trim();
  return `${proto}://${resolvedHost}`;
}

function getClientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

const checkoutBodySchema = z
  .object({
    quantity: z.number().int().min(1).max(200).optional(),
    mode: z.enum(["purchase", "addition"]).optional(),
  })
  .optional();

const statusByCode: Record<string, number> = {
  EVENT_NOT_FOUND: 404,
  EVENT_NOT_PUBLISHED: 404,
  EVENT_ENDED: 409,
  ALREADY_PURCHASED: 409,
  EVENT_FULL: 409,
  INVALID_QUANTITY: 400,
  INVALID_MODE: 409,
  MP_NOT_CONFIGURED: 400,
  MP_PREFERENCE_FAILED: 502,
};

/**
 * POST /api/events/[id]/checkout
 *
 * Autenticado: body `{ quantity?, mode? }` (compra o "agregar más cupos").
 * Sin sesión (guest checkout): body `{ name, email, phone, quantity }`. Crea o
 * reusa un usuario passwordless y procesa la compra; el centro se resuelve vía
 * `NEXT_PUBLIC_DEFAULT_CENTER_SLUG`. Si el email ya es de una cuenta registrada,
 * responde 409 `NEEDS_LOGIN`.
 *
 * Respuesta: `{ checkoutUrl }` (MP), `{ ticket, redirectTo }` (transferencia o
 * éxito guest) o `{ ticket }` (gratis autenticado).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  return session?.user?.id && session.user.centerId
    ? handleAuthenticated(request, id, session.user)
    : handleGuest(request, id);
}

async function handleAuthenticated(
  request: Request,
  id: string,
  user: { id: string; centerId?: string | null; name?: string | null; email?: string | null }
) {
  const userId = user.id;
  const centerId = user.centerId!;
  let quantity: number | undefined;
  let mode: "purchase" | "addition" | undefined;
  try {
    let parsedBody: z.infer<typeof checkoutBodySchema> = undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await request.text();
      if (raw.trim()) {
        const result = checkoutBodySchema.safeParse(JSON.parse(raw));
        if (!result.success) {
          return NextResponse.json(
            { code: "INVALID_QUANTITY", message: "Cantidad o modo inválido" },
            { status: 400 }
          );
        }
        parsedBody = result.data;
      }
    }
    quantity = parsedBody?.quantity;
    mode = parsedBody?.mode;

    const nameParts = (user.name ?? "").trim().split(/\s+/);
    const payerFirstName = nameParts[0] || undefined;
    const payerLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const result = await createEventCheckout({
      eventId: id,
      centerId,
      userId,
      baseUrl: getBaseUrl(request),
      quantity,
      mode,
      payerEmail: user.email ?? undefined,
      payerFirstName,
      payerLastName,
    });
    return respond(result);
  } catch (err) {
    return serverError(err, { eventId: id, userId, centerId, quantity, mode });
  }
}

async function handleGuest(request: Request, id: string) {
  try {
    if (!allowGuestCheckout(getClientIp(request))) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        { status: 429 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión o completar tus datos para comprar" },
        { status: 401 }
      );
    }
    const raw = await request.text();
    const parsed = guestCheckoutBodySchema.safeParse(raw.trim() ? JSON.parse(raw) : {});
    if (!parsed.success) {
      return NextResponse.json(
        { code: "INVALID_GUEST_DATA", message: "Revisa tus datos e intenta de nuevo" },
        { status: 400 }
      );
    }
    const { name, email, phone, quantity } = parsed.data;

    const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
    const center = slug ? await centerRepository.findBySlug(slug) : null;
    if (!center) {
      return NextResponse.json(
        { code: "SERVER_ERROR", message: "No pudimos identificar el centro." },
        { status: 500 }
      );
    }

    const guest = await resolveGuestUser({ centerId: center.id, email, name, phone });
    if (!guest.ok) {
      return NextResponse.json({ code: guest.code, message: guest.message }, { status: 409 });
    }

    const nameParts = name.trim().split(/\s+/);
    const payerFirstName = nameParts[0] || undefined;
    const payerLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const result = await createEventCheckout({
      eventId: id,
      centerId: center.id,
      userId: guest.userId,
      baseUrl: getBaseUrl(request),
      quantity,
      mode: "purchase",
      isGuest: true,
      payerEmail: email,
      payerFirstName,
      payerLastName,
    });
    return respond(result);
  } catch (err) {
    return serverError(err, { eventId: id, guest: true });
  }
}

function respond(result: Awaited<ReturnType<typeof createEventCheckout>>) {
  if (!result.success) {
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
}

function serverError(err: unknown, context: Record<string, unknown>) {
  console.error("[events checkout POST]", {
    ...context,
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
