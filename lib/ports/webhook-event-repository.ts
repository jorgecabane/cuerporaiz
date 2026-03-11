/**
 * Idempotencia de webhooks: registrar requestId por centro para no procesar dos veces.
 */
export interface IWebhookEventRepository {
  /** Devuelve true si ya fue procesado (idempotencia) */
  wasProcessed(centerId: string, requestId: string): Promise<boolean>;
  /** Marca como procesado. Llamar después de procesar. */
  markProcessed(centerId: string, requestId: string): Promise<void>;
}
