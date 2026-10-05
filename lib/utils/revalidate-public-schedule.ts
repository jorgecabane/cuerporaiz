import { revalidatePath } from "next/cache";

/**
 * La agenda pública (home y /horarios) es ISR: se refresca cuando cambian
 * clases o cupos, sin esperar el ciclo de revalidate. Fuera de un request
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
