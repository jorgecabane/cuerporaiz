/**
 * Fechas de feriado sin ambigüedad de zona horaria.
 * La fecha que el admin elige en `<input type="date">` (YYYY-MM-DD) es un día civil;
 * se persiste como Date UTC medianoche de ese día (mismo resultado que ISO date-only).
 */

export function parseHolidayDateInput(dateStr: string): Date {
  const parts = dateStr.trim().split("-").map(Number);
  const y = parts[0]!;
  const mo = parts[1]!;
  const d = parts[2]!;
  if (!y || !mo || !d) return new Date(NaN);
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Clave YYYY-MM-DD coherente con cómo guardamos el feriado (UTC date). */
export function holidayCalendarKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Mostrar feriado al usuario en español (día civil según UTC de lo guardado). */
export function formatHolidayDateDisplay(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
