import { revalidatePath } from "next/cache";

/**
 * La agenda pública (home y /horarios) es ISR: se refresca cuando el panel
 * cambia clases, sin esperar el ciclo de revalidate. Reservas y cancelaciones
 * no invalidan (cada una regeneraba dos páginas); los cupos se ponen al día
 * con el revalidate de 10 min. Fuera de un request
 * (tests, scripts) revalidatePath lanza: se ignora.
 */
export function revalidatePublicSchedule(): void {
  try {
    revalidatePath("/");
    revalidatePath("/horarios");
  } catch {
    // Sin request scope: nada que invalidar.
  }
}
