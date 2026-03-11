/**
 * Helper para generar enlaces "Añadir a Google Calendar".
 * Formato: https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */

export interface GoogleCalendarEventParams {
  title: string;
  /** Fecha/hora inicio en ISO (ej. 2025-03-15T10:00:00) */
  start: string;
  /** Fecha/hora fin en ISO */
  end: string;
  details?: string;
  location?: string;
  /** Zona horaria ej. America/Santiago */
  timeZone?: string;
}

/**
 * Convierte ISO a formato Google Calendar: YYYYMMDDTHHmmSS
 * Si timeZone se omite, se usa la hora local (sin Z).
 */
function toGoogleCalendarDate(iso: string, useUtc = false): string {
  const d = new Date(iso);
  if (useUtc) {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}${m}${day}T${h}${min}${s}`;
}

/**
 * Genera la URL para añadir el evento a Google Calendar.
 */
export function buildGoogleCalendarUrl(params: GoogleCalendarEventParams): string {
  const base = "https://calendar.google.com/calendar/render";
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${toGoogleCalendarDate(params.start)}/${toGoogleCalendarDate(params.end)}`,
  });
  if (params.details) search.set("details", params.details);
  if (params.location) search.set("location", params.location);
  if (params.timeZone) search.set("ctz", params.timeZone);
  return `${base}?${search.toString()}`;
}

/**
 * Texto corto de instrucción para incluir en emails.
 */
export function getAddToCalendarInstruction(calendarUrl: string): string {
  return `Añadir al calendario: ${calendarUrl}`;
}
