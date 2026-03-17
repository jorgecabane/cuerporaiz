import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";

/**
 * GET /api/admin/mercadopago/oauth
 * Inicia flujo OAuth: redirige al usuario a MercadoPago para autorizar.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });
  }

  const appId = process.env.MP_APP_ID?.trim() ?? "";
  if (!appId) {
    return NextResponse.json(
      { error: "MP_APP_ID no configurado en el servidor" },
      { status: 500 }
    );
  }

  const u = new URL(request.url);
  const xfProto = request.headers.get("x-forwarded-proto");
  const xfHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const proto = (xfProto ?? u.protocol.replace(":", "") ?? "http").split(",")[0].trim();
  const resolvedHost = (xfHost ?? host ?? u.host).split(",")[0].trim();
  const requestOrigin = `${proto}://${resolvedHost}`;
  const baseUrl =
    requestOrigin
    ?? process.env.NEXTAUTH_URL
    ?? process.env.NEXT_PUBLIC_BASE_URL
    ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/admin/mercadopago/oauth/callback`;

  const mpAuthUrl = new URL("https://auth.mercadopago.com/authorization");
  mpAuthUrl.searchParams.set("client_id", appId);
  mpAuthUrl.searchParams.set("response_type", "code");
  mpAuthUrl.searchParams.set("platform_id", "mp");
  mpAuthUrl.searchParams.set("redirect_uri", redirectUri);
  mpAuthUrl.searchParams.set("state", session.user.centerId);

  return NextResponse.redirect(mpAuthUrl.toString());
}
