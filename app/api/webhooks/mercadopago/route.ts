import { handleMercadopagoWebhookRequest } from "@/lib/application/mp-webhook-handler";

/**
 * Webhook genérico de MercadoPago. Una sola URL para todos los centros: el centro
 * se resuelve internamente vía `user_id` del cuerpo del webhook (que matchea con
 * el `mpUserId` que guardamos al conectar OAuth).
 *
 * Configurar en el panel de MP → Webhooks como `https://<dominio>/api/webhooks/mercadopago`.
 *
 * La firma `x-signature` se valida con `MP_WEBHOOK_SECRET` (env).
 */
export async function POST(request: Request) {
  return handleMercadopagoWebhookRequest(request);
}
