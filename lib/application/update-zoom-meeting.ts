import { getValidZoomAccessToken } from "@/lib/application/get-zoom-access-token";

export interface UpdateZoomMeetingParams {
  title?: string;
  startTime?: Date;
  durationMinutes?: number;
  timezone?: string;
}

/** Actualiza (PATCH) título, horario o duración de una reunión de Zoom existente. */
export async function updateZoomMeeting(
  centerId: string,
  meetingId: string,
  params: UpdateZoomMeetingParams
): Promise<void> {
  const accessToken = await getValidZoomAccessToken(centerId);

  const body: Record<string, unknown> = {};
  if (params.title !== undefined) body.topic = params.title;
  if (params.startTime !== undefined) {
    body.start_time = params.startTime.toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  if (params.durationMinutes !== undefined) body.duration = params.durationMinutes;
  if (params.timezone !== undefined) body.timezone = params.timezone;
  if (Object.keys(body).length === 0) return;

  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Zoom update meeting failed:", res.status, text);
    throw new Error("No se pudo actualizar la reunión en Zoom.");
  }
}

/** Elimina una reunión de Zoom. Best-effort: nunca lanza, solo loguea el error. */
export async function deleteZoomMeeting(centerId: string, meetingId: string): Promise<void> {
  try {
    const accessToken = await getValidZoomAccessToken(centerId);
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error("Zoom delete meeting (best-effort) failed:", err);
  }
}
