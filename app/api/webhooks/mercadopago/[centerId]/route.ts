import { handleMercadopagoWebhookRequest } from "@/lib/application/mp-webhook-handler";

/**
 * Compatibilidad con preferencias antiguas que registraron el `notification_url`
 * como `/api/webhooks/mercadopago/<centerId>`. El centro real se sigue resolviendo
 * desde `body.user_id` (mpUserId), por lo que el segmento `[centerId]` se ignora.
 *
 * No usar esta ruta para preferencias nuevas — usar la canónica `…/mercadopago`.
 */
export async function POST(request: Request) {
  return handleMercadopagoWebhookRequest(request);
}
