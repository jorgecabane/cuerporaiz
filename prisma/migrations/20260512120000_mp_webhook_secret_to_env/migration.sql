-- Mueve la clave secreta de webhook MP de un valor por-centro en DB a un env global
-- (`MP_WEBHOOK_SECRET`). El secret real lo emite MercadoPago al guardar la configuración
-- de webhooks de la app, así que es por-aplicación, no por-merchant. La columna queda
-- nullable y se borrará en una migración futura cuando confirmemos que ningún consumer
-- la lee.
ALTER TABLE "CenterMercadoPagoConfig" ALTER COLUMN "webhookSecret" DROP NOT NULL;

-- Un merchant MP (mpUserId) sólo puede estar conectado a un centro. Lo necesitamos
-- para enrutar webhooks genéricos (`/api/webhooks/mercadopago`) al centro correcto.
ALTER TABLE "CenterMercadoPagoConfig" ADD CONSTRAINT "CenterMercadoPagoConfig_mpUserId_key" UNIQUE ("mpUserId");
