import { zoomConfigRepository } from "@/lib/adapters/db";

const ZOOM_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 min before expiry

async function refreshZoomToken(centerId: string): Promise<string> {
  const config = await zoomConfigRepository.findByCenterId(centerId);
  if (!config?.refreshToken) {
    throw new Error("Zoom: no hay refresh token para renovar");
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Zoom no está configurado en el servidor");
  }

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Zoom token refresh failed:", text);
    throw new Error("No se pudo renovar la sesión de Zoom. Vuelve a conectar Zoom en Plugins.");
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const tokenExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  await zoomConfigRepository.upsert(centerId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
    tokenExpiresAt,
  });

  return data.access_token;
}

/**
 * Devuelve un access token de Zoom válido para el centro, renovándolo primero
 * si está vencido o a punto de vencer. Lanza si Zoom no está conectado.
 */
export async function getValidZoomAccessToken(centerId: string): Promise<string> {
  const config = await zoomConfigRepository.findByCenterId(centerId);
  if (!config) {
    throw new Error("Zoom no está conectado para este centro. Configuralo en Plugins.");
  }

  const now = new Date();
  if (
    config.tokenExpiresAt &&
    config.tokenExpiresAt.getTime() - ZOOM_TOKEN_REFRESH_BUFFER_MS < now.getTime()
  ) {
    return refreshZoomToken(centerId);
  }

  return config.accessToken;
}
