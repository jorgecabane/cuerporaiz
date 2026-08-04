import { getValidZoomAccessToken } from "@/lib/application/get-zoom-access-token";

export interface CreateZoomMeetingParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
  recurring?: boolean;
}

export interface CreateZoomMeetingResult {
  joinUrl: string;
  externalId: string;
}

export async function createZoomMeeting(
  centerId: string,
  params: CreateZoomMeetingParams
): Promise<CreateZoomMeetingResult> {
  const accessToken = await getValidZoomAccessToken(centerId);

  const startTimeISO = params.startTime.toISOString().replace(/\.\d{3}Z$/, "Z");
  const timezone = params.timezone ?? "America/Santiago";

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(
      params.recurring
        ? { topic: params.title, type: 3, timezone }
        : {
            topic: params.title,
            type: 2, // scheduled
            start_time: startTimeISO,
            duration: params.durationMinutes,
            timezone,
          }
    ),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Zoom create meeting failed:", res.status, text);
    throw new Error("No se pudo crear la reunión en Zoom. Revisa la conexión o vuelve a conectar Zoom en Plugins.");
  }

  const data = (await res.json()) as { id?: number | string; join_url?: string };
  if (!data.join_url || data.id == null) {
    throw new Error("Zoom no devolvió el link o el id de la reunión.");
  }

  return { joinUrl: data.join_url, externalId: String(data.id) };
}
