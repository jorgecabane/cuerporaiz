import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { requestBaseUrl } from "@/lib/utils/request-base-url";

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
    return NextResponse.json({ error: "Solo administración" }, { status: 403 });
  }

  const appId = process.env.MP_APP_ID?.trim() ?? "";
  if (!appId) {
    return NextResponse.json(
      { error: "MP_APP_ID no configurado en el servidor" },
      { status: 500 }
    );
  }

  const baseUrl = requestBaseUrl(request.headers, request.url);
  const redirectUri = `${baseUrl}/api/admin/mercadopago/oauth/callback`;

  const mpAuthUrl = new URL("https://auth.mercadopago.com/authorization");
  mpAuthUrl.searchParams.set("client_id", appId);
  mpAuthUrl.searchParams.set("response_type", "code");
  mpAuthUrl.searchParams.set("platform_id", "mp");
  mpAuthUrl.searchParams.set("redirect_uri", redirectUri);
  mpAuthUrl.searchParams.set("state", session.user.centerId);

  return NextResponse.redirect(mpAuthUrl.toString());
}
