/**
 * Helpers para formatear fechas/horas en correos en la TZ del centro.
 * Si tz no se pasa, asume "America/Santiago" (default histórico).
 */

const DEFAULT_TZ = "America/Santiago";

/** "lunes, 12 de mayo · 18:30" */
export function formatLongDateTime(iso: string | Date, timeZone = DEFAULT_TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const date = d.toLocaleDateString("es-CL", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = d.toLocaleTimeString("es-CL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

/** "12 de mayo de 2026" */
export function formatLongDate(iso: string | Date, timeZone = DEFAULT_TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("es-CL", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "18:30" */
export function formatTime(iso: string | Date, timeZone = DEFAULT_TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("es-CL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
