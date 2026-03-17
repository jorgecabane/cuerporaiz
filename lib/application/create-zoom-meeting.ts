import { zoomConfigRepository } from "@/lib/adapters/db";

const ZOOM_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 min before expiry

export interface CreateZoomMeetingParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
}

export interface CreateZoomMeetingResult {
  joinUrl: string;
}

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
    throw new Error("No se pudo renovar la sesión de Zoom. Reconectá Zoom en Plugins.");
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

export async function createZoomMeeting(
  centerId: string,
  params: CreateZoomMeetingParams
): Promise<CreateZoomMeetingResult> {
  const config = await zoomConfigRepository.findByCenterId(centerId);
  if (!config) {
    throw new Error("Zoom no está conectado para este centro. Configuralo en Plugins.");
  }

  let accessToken = config.accessToken;
  const now = new Date();
  if (
    config.tokenExpiresAt &&
    config.tokenExpiresAt.getTime() - ZOOM_TOKEN_REFRESH_BUFFER_MS < now.getTime()
  ) {
    accessToken = await refreshZoomToken(centerId);
  }

  const startTimeISO = params.startTime.toISOString().replace(/\.\d{3}Z$/, "Z");
  const timezone = params.timezone ?? "America/Santiago";

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      topic: params.title,
      type: 2, // scheduled
      start_time: startTimeISO,
      duration: params.durationMinutes,
      timezone,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Zoom create meeting failed:", res.status, text);
    throw new Error("No se pudo crear la reunión en Zoom. Revisá la conexión o reconectá Zoom en Plugins.");
  }

  const data = (await res.json()) as { join_url?: string };
  if (!data.join_url) {
    throw new Error("Zoom no devolvió el link de la reunión.");
  }

  return { joinUrl: data.join_url };
}
