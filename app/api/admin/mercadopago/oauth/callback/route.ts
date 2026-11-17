import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { prisma } from "@/lib/adapters/db/prisma";
import { requestBaseUrl } from "@/lib/utils/request-base-url";

/**
 * GET /api/admin/mercadopago/oauth/callback?code=xxx&state=centerId
 * MercadoPago redirige aquí después de que el centro autoriza.
 * Intercambia el code por access_token + refresh_token.
 */
export async function GET(request: Request) {
  const baseUrl = requestBaseUrl(request.headers, request.url);

  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.redirect(new URL("/auth/login", baseUrl));
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.redirect(new URL("/panel", baseUrl));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || state !== session.user.centerId) {
    return NextResponse.redirect(
      new URL("/panel/plugins?error=oauth_invalid", baseUrl)
    );
  }

  const appId = process.env.MP_APP_ID?.trim() ?? "";
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = `${baseUrl}/api/admin/mercadopago/oauth/callback`;

  if (!appId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/panel/plugins?error=mp_not_configured", baseUrl)
    );
  }

  const useTestToken = clientSecret.startsWith("TEST-") || process.env.MP_TEST_MODE === "true";
  const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: appId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code" as const,
      redirect_uri: redirectUri,
      ...(useTestToken && { test_token: "true" }),
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error("MP OAuth token exchange failed:", tokenRes.status, errBody);
    return NextResponse.redirect(
      new URL("/panel/plugins?error=oauth_exchange_failed", baseUrl)
    );
  }

  const tokenData = await tokenRes.json();

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.centerMercadoPagoConfig.upsert({
    where: { centerId: session.user.centerId },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      mpUserId: tokenData.user_id?.toString() ?? null,
      publicKey: tokenData.public_key ?? null,
      tokenExpiresAt: expiresAt,
      enabled: true,
    },
    create: {
      centerId: session.user.centerId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      mpUserId: tokenData.user_id?.toString() ?? null,
      publicKey: tokenData.public_key ?? null,
      tokenExpiresAt: expiresAt,
      enabled: true,
    },
  });

  return NextResponse.redirect(
    new URL("/panel/plugins?success=mp_connected", baseUrl)
  );
}
