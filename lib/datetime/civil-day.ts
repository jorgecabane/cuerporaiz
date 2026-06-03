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

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Día de la semana civil (0=Dom..6=Sáb) de un instante en una IANA timezone.
 *
 * Caso de uso: matchear el día de una clase guardada como UTC (ej. 20:00
 * Chile = 00:00 UTC del día siguiente) contra un set de daysOfWeek que el
 * usuario eligió en su calendario civil. Usar `.getUTCDay()` da el día UTC
 * y produce un shift de 1 día cuando la hora cae cerca de medianoche local.
 */
export function civilDayOfWeekInTz(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const idx = WEEKDAY_INDEX[name];
  if (idx === undefined) {
    throw new Error(`civilDayOfWeekInTz: weekday no reconocido (${name})`);
  }
  return idx;
}

/** {year, month} (1-based) del día civil en una IANA timezone. */
export function civilYearMonthInTz(
  date: Date,
  timeZone: string,
): { year: number; month: number } {
  const key = civilDayKeyInTz(date, timeZone);
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

/** Día del mes civil (1-31) en una IANA timezone. */
export function civilDayOfMonthInTz(date: Date, timeZone: string): number {
  const key = civilDayKeyInTz(date, timeZone);
  return Number(key.split("-")[2]);
}
