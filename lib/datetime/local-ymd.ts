/**
 * Clave de calendario local YYYY-MM-DD (no UTC).
 * Usar para alinear filas del calendario con `getDate()` / `toLocaleDateString`.
 */
export function localYmdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO instant → día civil local del usuario. */
export function localYmdFromIso(iso: string): string {
  return localYmdFromDate(new Date(iso));
}
