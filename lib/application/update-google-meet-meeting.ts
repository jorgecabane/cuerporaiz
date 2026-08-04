import { getValidGoogleAccessToken } from "@/lib/application/get-google-access-token";

export interface UpdateGoogleMeetMeetingParams {
  title?: string;
  startTime?: Date;
  durationMinutes?: number;
  timezone?: string;
}

/** Actualiza (PATCH) título u horario de un evento de Google Calendar/Meet existente. */
export async function updateGoogleMeetMeeting(
  centerId: string,
  eventId: string,
  params: UpdateGoogleMeetMeetingParams
): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(centerId);

  const body: Record<string, unknown> = {};
  if (params.title !== undefined) body.summary = params.title;
  // start y end viajan juntos: Calendar requiere que end sea posterior a start, así
  // que sólo se actualiza el horario si tenemos ambos (startTime + durationMinutes)
  // para mantener el evento consistente.
  if (params.startTime !== undefined && params.durationMinutes !== undefined) {
    const timeZone = params.timezone ?? "America/Santiago";
    const end = new Date(params.startTime.getTime() + params.durationMinutes * 60 * 1000);
    body.start = { dateTime: params.startTime.toISOString(), timeZone };
    body.end = { dateTime: end.toISOString(), timeZone };
  }
  if (Object.keys(body).length === 0) return;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Google Calendar update event failed:", res.status, text);
    throw new Error("No se pudo actualizar la reunión en Google Meet.");
  }
}

/** Elimina un evento de Google Calendar/Meet. Best-effort: nunca lanza, solo loguea el error. */
export async function deleteGoogleMeetMeeting(centerId: string, eventId: string): Promise<void> {
  try {
    const accessToken = await getValidGoogleAccessToken(centerId);
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error("Google Meet delete meeting (best-effort) failed:", err);
  }
}
