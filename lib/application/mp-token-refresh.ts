/**
 * Renueva los access_token de MP que vencen pronto. Los tokens OAuth de MP duran
 * 180 días y, una vez vencidos, el refresh_token tampoco sirve: el centro tendría
 * que volver a autorizar. Por eso se renueva con harto margen desde un cron diario.
 */
import { prisma } from "@/lib/adapters/db/prisma";
import { sendSecurityAlert } from "./security-alerts";

const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function refreshExpiringMpTokens(now: Date): Promise<{ refreshed: number; failed: number }> {
  const configs = await prisma.centerMercadoPagoConfig.findMany({
    where: {
      enabled: true,
      refreshToken: { not: null },
      tokenExpiresAt: { lte: new Date(now.getTime() + REFRESH_WINDOW_MS) },
    },
    select: { centerId: true, refreshToken: true },
  });

  let refreshed = 0;
  for (const { centerId, refreshToken } of configs) {
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.MP_APP_ID?.trim(),
        client_secret: process.env.MP_CLIENT_SECRET?.trim(),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.access_token) {
      await sendSecurityAlert({
        kind: "mp_token_refresh_failed",
        severity: "HIGH",
        metadata: { centerId, status: res.status, message: data.message ?? data.error ?? null },
      });
      continue;
    }

    await prisma.centerMercadoPagoConfig.update({
      where: { centerId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        tokenExpiresAt: new Date(now.getTime() + data.expires_in * 1000),
      },
    });
    refreshed++;
  }

  return { refreshed, failed: configs.length - refreshed };
}
