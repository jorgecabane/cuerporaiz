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

/** {year, month, day} (todos 1-based salvo year) del día civil en una IANA TZ. */
export function civilYearMonthDayInTz(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const key = civilDayKeyInTz(date, timeZone);
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** {hour, minute} (24h) del instante en una IANA timezone. */
export function civilHourMinuteInTz(
  date: Date,
  timeZone: string,
): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  // Intl ocasionalmente devuelve "24" para medianoche en algunos locales.
  return { hour: hour === 24 ? 0 : hour, minute };
}

/**
 * Offset (en ms) entre la TZ civil y UTC en un instante dado.
 * Positivo si la TZ está adelantada de UTC; negativo si está atrás.
 *
 * Estrategia: pedirle a Intl qué hora civil le corresponde al instante
 * `date` en `timeZone`, y restar el UTC original. La diferencia ES el
 * offset al instante exacto — DST se respeta porque el offset cambia
 * según el momento del año.
 */
function getTzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const hour = get("hour") === 24 ? 0 : get("hour");
  const tzAsMillis = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return tzAsMillis - date.getTime();
}

/**
 * Convierte un día/hora civil en una IANA timezone al instante UTC
 * correspondiente. Maneja DST automáticamente porque el offset se
 * computa al instante real (no a un offset fijo de creación).
 *
 * Ejemplo: 20:00 civil Chile el 25-mar-2026 (verano, UTC-3) → 23:00 UTC.
 *          20:00 civil Chile el 08-jul-2026 (invierno, UTC-4) → 00:00 UTC.
 */
export function civilDateTimeInTzToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // Primera aproximación: tratar los valores civiles como UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // El instante real = guess - offset (porque civil = UTC + offset).
  const offsetMs = getTzOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}
