import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";

/**
 * GET /api/admin/zoom/oauth
 * Inicia flujo OAuth: redirige al usuario a Zoom para autorizar.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Solo administración" }, { status: 403 });
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "ZOOM_CLIENT_ID no configurado en el servidor" },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/admin/zoom/oauth/callback`;

  const zoomAuthUrl = new URL("https://zoom.us/oauth/authorize");
  zoomAuthUrl.searchParams.set("response_type", "code");
  zoomAuthUrl.searchParams.set("client_id", clientId);
  zoomAuthUrl.searchParams.set("redirect_uri", redirectUri);
  zoomAuthUrl.searchParams.set("state", session.user.centerId);

  return NextResponse.redirect(zoomAuthUrl.toString());
}
