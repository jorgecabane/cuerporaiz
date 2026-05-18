/**
 * Clave de día civil (YYYY-MM-DD) en una IANA timezone arbitraria.
 *
 * Caso de uso: comparar el día calendario de una clase (almacenada como
 * `startsAt: Date` en UTC representando hora local del centro) con la fecha
 * de un feriado (almacenada como UTC midnight del día civil).
 *
 * Ejemplo: una clase a las 20:15 hora Chile (UTC-4 en mayo) se almacena
 * como `2026-05-22T00:15:00Z`. `toISOString().slice(0, 10)` daría
 * "2026-05-22", pero el día civil en Chile es "2026-05-21". Esta helper
 * devuelve "2026-05-21" cuando se le pasa `tz: "America/Santiago"`.
 */
export function civilDayKeyInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}
