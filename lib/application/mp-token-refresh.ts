/**
 * Renueva los access_token de MP que vencen pronto. Los tokens OAuth de MP duran
 * 180 días y, una vez vencidos, el refresh_token tampoco sirve: el centro tendría
 * que volver a autorizar. Por eso se renueva con harto margen desde un cron diario.
 */
import { prisma } from "@/lib/adapters/db/prisma";
import { sendSecurityAlert } from "./security-alerts";

const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function refreshExpiringMpTokens(now: Date): Promise<{ refreshed: number; failed: number }> {
  const clientId = process.env.MP_APP_ID?.trim();
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    await sendSecurityAlert({ kind: "mp_token_refresh_misconfigured", severity: "HIGH", metadata: {} });
    return { refreshed: 0, failed: 0 };
  }

  // Sin enabled: un centro con MP apagado igual mantiene vivo su token para cuando lo vuelva a prender.
  const configs = await prisma.centerMercadoPagoConfig.findMany({
    where: {
      refreshToken: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: new Date(now.getTime() + REFRESH_WINDOW_MS) } }],
    },
    select: { centerId: true, refreshToken: true },
  });

  let refreshed = 0;
  for (const { centerId, refreshToken } of configs) {
    try {
      const res = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) {
        throw Object.assign(new Error(data.message ?? data.error ?? "sin access_token"), { status: res.status });
      }

      await prisma.centerMercadoPagoConfig.update({
        where: { centerId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? refreshToken,
          tokenExpiresAt: data.expires_in ? new Date(now.getTime() + data.expires_in * 1000) : null,
        },
      });
      refreshed++;
    } catch (err) {
      const e = err as Error & { status?: number };
      await sendSecurityAlert({
        kind: "mp_token_refresh_failed",
        severity: "HIGH",
        metadata: { centerId, status: e.status ?? null, message: e.message },
      });
    }
  }

  return { refreshed, failed: configs.length - refreshed };
}
