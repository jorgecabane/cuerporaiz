/**
 * DTOs para checkout y pagos MercadoPago. La aplicación trabaja solo con estos tipos;
 * ningún tipo del SDK/API de MercadoPago debe usarse fuera del adapter.
 * Nunca se almacenan ni manejan datos de tarjeta.
 */
import { z } from "zod";

// ─── Crear preferencia (checkout) ────────────────────────────────────────────

export interface CreatePreferenceDto {
  /** Access token del centro (tenant) para MP */
  accessToken: string;
  /** Título del ítem (ej. "Pack 6 clases") */
  title: string;
  /** Cantidad (normalmente 1) */
  quantity: number;
  /** Precio unitario en la unidad mínima de la moneda (CLP = pesos) */
  unitPrice: number;
  /** Referencia nuestra para asociar pago ↔ orden (ej. orderId) */
  externalReference: string;
  /** URLs de retorno (success, failure, pending) */
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  /** URL de notificación webhook (por centro) */
  notificationUrl: string;
  /** Redirigir automáticamente al aprobar */
  autoReturn?: "approved";
  /** Email del pagador (opcional, MP puede pedirlo en checkout) */
  payerEmail?: string;
  /** Nombre del pagador (mejora tasa de aprobación, recomendación MP) */
  payerFirstName?: string;
  /** Apellido del pagador (mejora tasa de aprobación, recomendación MP) */
  payerLastName?: string;
  /** Descripción en resumen de tarjeta (máx. 22 caracteres, ej. "CUERPORAIZ") */
  statementDescriptor?: string;
  /** ID del ítem en nuestro sistema (mejora aprobación) */
  itemId?: string;
  /** Descripción del ítem (mejora aprobación) */
  itemDescription?: string;
  /** Categoría MP del ítem (ej. "services") */
  itemCategoryId?: string;
}

export const createPreferenceDtoSchema = z.object({
  accessToken: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  externalReference: z.string().min(1),
  backUrls: z.object({
    success: z.string().url(),
    failure: z.string().url(),
    pending: z.string().url(),
  }),
  notificationUrl: z.string().url(),
  autoReturn: z.literal("approved").optional(),
  payerEmail: z.string().email().optional(),
  payerFirstName: z.string().optional(),
  payerLastName: z.string().optional(),
  statementDescriptor: z.string().max(22).optional(),
  itemId: z.string().optional(),
  itemDescription: z.string().optional(),
  itemCategoryId: z.string().optional(),
});

/** Resultado de crear preferencia: URL de checkout y ID de preferencia */
export interface CreatePreferenceResultDto {
  success: boolean;
  checkoutUrl?: string;
  preferenceId?: string;
  error?: string;
}

// ─── Re-consulta de pago en API MP ───────────────────────────────────────────

export interface GetPaymentDto {
  accessToken: string;
  paymentId: string;
}

export interface PaymentStatusDto {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "charged_back" | "in_mediation";
  statusDetail?: string;
  externalReference?: string;
  transactionAmount?: number;
  dateApproved?: string;
}

// ─── Webhook: validación de firma ────────────────────────────────────────────

export interface WebhookVerifySignatureDto {
  /** Cuerpo raw del request (para construir manifest) */
  body: string;
  /** Header x-signature (ts=...,v1=...) */
  xSignature: string | null;
  /** Header x-request-id */
  xRequestId: string | null;
  /** ID del recurso (data.id para payment, o id para merchant_order) */
  resourceId: string;
  /** Secret del webhook del centro */
  webhookSecret: string;
}

export interface WebhookProcessResultDto {
  success: boolean;
  alreadyProcessed?: boolean;
  error?: string;
}

// ─── API request: crear checkout ──────────────────────────────────────────────

export const createCheckoutBodySchema = z.object({
  planId: z.string().cuid(),
  centerId: z.string().min(1).optional(), // slug o id
  centerSlug: z.string().min(1).optional(),
});
export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
