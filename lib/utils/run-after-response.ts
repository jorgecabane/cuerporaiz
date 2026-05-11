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
