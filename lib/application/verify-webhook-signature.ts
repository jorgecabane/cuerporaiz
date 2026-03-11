/**
 * Validación de firma x-signature de webhooks MercadoPago.
 * Manifest: id:{resourceId};request-id:{requestId};ts:{timestamp};
 * HMAC-SHA256 con webhook secret; comparación en tiempo constante.
 */
import * as crypto from "node:crypto";
import type { WebhookVerifySignatureDto } from "@/lib/dto/checkout-dto";

export function verifyMercadoPagoWebhookSignature(dto: WebhookVerifySignatureDto): boolean {
  if (!dto.xSignature || !dto.xRequestId || !dto.webhookSecret) return false;

  const match = dto.xSignature.match(/ts=(\d+),v1=([a-f0-9]+)/i);
  if (!match) return false;
  const [, ts, v1] = match;
  if (!ts || !v1) return false;

  const manifest = `id:${dto.resourceId};request-id:${dto.xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", dto.webhookSecret)
    .update(manifest)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
