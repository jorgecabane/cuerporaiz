import { getValidGoogleAccessToken } from "@/lib/application/get-google-access-token";

export interface CreateGoogleMeetMeetingParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
}

export interface CreateGoogleMeetMeetingResult {
  joinUrl: string;
  externalId: string;
}

export async function createGoogleMeetMeeting(
  centerId: string,
  params: CreateGoogleMeetMeetingParams
): Promise<CreateGoogleMeetMeetingResult> {
  const accessToken = await getValidGoogleAccessToken(centerId);

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
    throw new Error("No se pudo crear la reunión en Google Meet. Revisa la conexión o vuelve a conectar Meet en Plugins.");
  }

  const data = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ uri?: string }> };
  };
  const joinUrl = data.hangoutLink ?? data.conferenceData?.entryPoints?.[0]?.uri;
  if (!joinUrl || !data.id) {
    throw new Error("Google Meet no devolvió el link o el id del evento.");
  }

  return { joinUrl, externalId: data.id };
}
