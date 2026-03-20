/**
 * Políticas de tiempo del centro (anticipación para cancelar / ventana de reserva).
 * Almacenamos siempre en minutos para permitir granularidad en la UI.
 */

export const MAX_CANCEL_BEFORE_MINUTES = 7 * 24 * 60; // 7 días
export const MAX_BOOK_BEFORE_MINUTES = 30 * 24 * 60; // 30 días

export type PolicyTimeUnit = "minutes" | "hours" | "days";

export function minutesFromPolicyInput(value: number, unit: PolicyTimeUnit): number {
  const v = Math.floor(Number(value));
  if (!Number.isFinite(v) || v < 0) return 0;
  switch (unit) {
    case "minutes":
      return v;
    case "hours":
      return v * 60;
    case "days":
      return v * 24 * 60;
    default:
      return v;
  }
}

/** Unidad y valor por defecto para inputs a partir de minutos ya guardados. */
export function defaultPolicyDisplay(
  minutes: number | null | undefined,
): { value: number; unit: PolicyTimeUnit } {
  const raw = Number(minutes);
  if (!Number.isFinite(raw) || raw < 0) {
    return { value: 0, unit: "hours" };
  }
  const m = Math.floor(raw);
  if (m === 0) return { value: 0, unit: "hours" };
  if (m % (24 * 60) === 0) return { value: m / (24 * 60), unit: "days" };
  if (m % 60 === 0) return { value: m / 60, unit: "hours" };
  return { value: m, unit: "minutes" };
}

/** Copy corto para políticas (ej. sheet de reservas). */
export function formatMinutesAsShortSpanish(minutes: number | null | undefined): string {
  const raw = Number(minutes);
  if (!Number.isFinite(raw) || raw < 0) return "0 minutos";
  const m = Math.floor(raw);
  if (m === 0) return "0 minutos";
  if (m % (24 * 60) === 0) {
    const d = m / (24 * 60);
    return d === 1 ? "1 día" : `${d} días`;
  }
  if (m % 60 === 0) {
    const h = m / 60;
    return h === 1 ? "1 hora" : `${h} horas`;
  }
  return m === 1 ? "1 minuto" : `${m} minutos`;
}
