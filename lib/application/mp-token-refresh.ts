/**
 * Refresca el access_token de MP si está vencido o próximo a vencer.
 * Devuelve el access_token vigente.
 */
import { prisma } from "@/lib/adapters/db/prisma";

const REFRESH_BUFFER_MS = 30 * 60 * 1000; // 30 minutos antes de expirar

export async function getValidAccessToken(centerId: string): Promise<string | null> {
  const config = await prisma.centerMercadoPagoConfig.findUnique({
    where: { centerId },
  });
  if (!config || !config.enabled) return null;

  const now = Date.now();
  const needsRefresh =
    config.tokenExpiresAt &&
    config.refreshToken &&
    config.tokenExpiresAt.getTime() - now < REFRESH_BUFFER_MS;

  if (!needsRefresh) return config.accessToken;

  const appId = process.env.MP_APP_ID?.trim() ?? "";
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim() ?? "";
  if (!appId || !clientSecret) return config.accessToken;

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: appId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!res.ok) {
    console.error("MP token refresh failed:", await res.text());
    return config.accessToken;
  }

  const data = await res.json();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  await prisma.centerMercadoPagoConfig.update({
    where: { centerId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? config.refreshToken,
      tokenExpiresAt: expiresAt,
    },
  });

  return data.access_token;
}
