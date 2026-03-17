import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { zoomConfigRepository } from "@/lib/adapters/db";

/**
 * GET /api/admin/zoom/oauth/callback?code=xxx&state=centerId
 * Zoom redirige aquí después de que el centro autoriza.
 * Intercambia el code por access_token y refresh_token.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || state !== session.user.centerId) {
    return NextResponse.redirect(
      new URL("/panel/plugins/zoom?error=oauth_invalid", request.url)
    );
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/admin/zoom/oauth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/panel/plugins/zoom?error=zoom_not_configured", request.url)
    );
  }

  const tokenRes = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Zoom OAuth token exchange failed:", text);
    return NextResponse.redirect(
      new URL("/panel/plugins/zoom?error=oauth_exchange_failed", request.url)
    );
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const tokenExpiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await zoomConfigRepository.upsert(session.user.centerId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    tokenExpiresAt,
    enabled: true,
  });

  return NextResponse.redirect(
    new URL("/panel/plugins/zoom?success=connected", request.url)
  );
}
