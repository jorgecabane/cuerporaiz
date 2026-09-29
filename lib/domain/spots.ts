/** Texto de disponibilidad de una clase: "7 de 10 cupos disponibles" o "Completo". */
export function formatSpotsAvailable(spotsLeft: number, capacity: number): string {
  if (spotsLeft <= 0) return "Completo";
  return `${spotsLeft} de ${capacity} cupos disponibles`;
}

/** Proporción ocupada (0–1) para la barra de cupos. */
export function spotsFillRatio(spotsLeft: number, capacity: number): number {
  if (capacity <= 0) return 1;
  return Math.min(1, Math.max(0, (capacity - spotsLeft) / capacity));
}
