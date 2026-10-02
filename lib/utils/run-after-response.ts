import { after } from "next/server";

/**
 * Ejecuta una promise en background tras devolver la response al cliente.
 *
 * En producción (Next.js + Vercel), usa `after()` que extiende la vida de la
 * function hasta que la promise termine — Active CPU pricing no cobra el wait
 * de I/O, y el cliente recibe la response inmediatamente.
 *
 * En tests / scripts (sin request scope), `after()` lanza. Hacemos fallback
 * a fire-and-forget puro: la promise igual se ejecuta, no se espera.
 */
export function runAfterResponse(promise: Promise<unknown>): void {
  try {
    after(promise);
  } catch {
    // Fuera de request scope: no se puede extender la function. Igual disparamos
    // la promise para que se ejecute (en tests, donde no hay nada que esperar).
    promise.catch(() => {});
  }
}

/**
 * Corre trabajo async (cargar datos + enviar correos) sin bloquear la respuesta.
 * Registra after() en el MISMO tick de la llamada, mientras el request sigue
 * vivo: si se registrara recién después de los primeros await, el request ya
 * podría haber respondido y Next lo ignora en silencio (el trabajo se pierde).
 * Las tareas deben esperar (await) sus envíos para que queden dentro.
 */
export function runInBackground(task: () => Promise<void>): Promise<void> {
  const work = task();
  runAfterResponse(work);
  return work;
}
