import { googleMeetConfigRepository } from "@/lib/adapters/db";

const MEET_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 min before expiry

async function refreshGoogleMeetToken(centerId: string): Promise<string> {
  const config = await googleMeetConfigRepository.findByCenterId(centerId);
  if (!config?.refreshToken) {
    throw new Error("Google Meet: no hay refresh token para renovar");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Meet no está configurado en el servidor");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Google token refresh failed:", text);
    throw new Error("No se pudo renovar la sesión de Google Meet. Vuelve a conectar Meet en Plugins.");
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const tokenExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  await googleMeetConfigRepository.upsert(centerId, {
    accessToken: data.access_token,
    refreshToken: config.refreshToken,
    tokenExpiresAt,
  });

  return data.access_token;
}

/**
 * Devuelve un access token de Google Meet válido para el centro, renovándolo
 * primero si está vencido o a punto de vencer. Lanza si Meet no está conectado.
 */
export async function getValidGoogleAccessToken(centerId: string): Promise<string> {
  const config = await googleMeetConfigRepository.findByCenterId(centerId);
  if (!config) {
    throw new Error("Google Meet no está conectado para este centro. Configuralo en Plugins.");
  }

  const now = new Date();
  if (
    config.tokenExpiresAt &&
    config.tokenExpiresAt.getTime() - MEET_TOKEN_REFRESH_BUFFER_MS < now.getTime()
  ) {
    return refreshGoogleMeetToken(centerId);
  }

  return config.accessToken;
}
