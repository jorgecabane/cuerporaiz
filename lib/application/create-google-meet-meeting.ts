import { googleMeetConfigRepository } from "@/lib/adapters/db";

const MEET_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 min before expiry

export interface CreateGoogleMeetMeetingParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
}

export interface CreateGoogleMeetMeetingResult {
  joinUrl: string;
}

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
    throw new Error("No se pudo renovar la sesión de Google Meet. Reconectá Meet en Plugins.");
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

export async function createGoogleMeetMeeting(
  centerId: string,
  params: CreateGoogleMeetMeetingParams
): Promise<CreateGoogleMeetMeetingResult> {
  const config = await googleMeetConfigRepository.findByCenterId(centerId);
  if (!config) {
    throw new Error("Google Meet no está conectado para este centro. Configuralo en Plugins.");
  }

  let accessToken = config.accessToken;
  const now = new Date();
  if (
    config.tokenExpiresAt &&
    config.tokenExpiresAt.getTime() - MEET_TOKEN_REFRESH_BUFFER_MS < now.getTime()
  ) {
    accessToken = await refreshGoogleMeetToken(centerId);
  }

  const timezone = params.timezone ?? "America/Santiago";
  const start = params.startTime;
  const end = new Date(start.getTime() + params.durationMinutes * 60 * 1000);

  const event = {
    summary: params.title,
    start: {
      dateTime: start.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: timezone,
    },
    conferenceData: {
      createRequest: {
        requestId: `cuerporaiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Google Calendar create event failed:", res.status, text);
    throw new Error("No se pudo crear la reunión en Google Meet. Revisá la conexión o reconectá Meet en Plugins.");
  }

  const data = (await res.json()) as { hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ uri?: string }> } };
  const joinUrl = data.hangoutLink ?? data.conferenceData?.entryPoints?.[0]?.uri;
  if (!joinUrl) {
    throw new Error("Google Meet no devolvió el link de la reunión.");
  }

  return { joinUrl };
}
