import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { googleMeetConfigRepository } from "@/lib/adapters/db";

/**
 * GET /api/admin/google-meet/oauth/callback?code=xxx&state=centerId
 * Google redirige aquí después de que el centro autoriza.
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
      new URL("/panel/plugins/meet?error=oauth_invalid", request.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/admin/google-meet/oauth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/panel/plugins/meet?error=meet_not_configured", request.url)
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Google OAuth token exchange failed:", text);
    return NextResponse.redirect(
      new URL("/panel/plugins/meet?error=oauth_exchange_failed", request.url)
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

  await googleMeetConfigRepository.upsert(session.user.centerId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    tokenExpiresAt,
    enabled: true,
  });

  return NextResponse.redirect(
    new URL("/panel/plugins/meet?success=connected", request.url)
  );
}
