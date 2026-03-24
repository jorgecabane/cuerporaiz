/**
 * DTOs para suscripciones recurrentes y preaprobaciones MercadoPago.
 * La aplicación trabaja solo con estos tipos; ningún tipo del SDK/API de MercadoPago
 * debe usarse fuera del adapter. Nunca se almacenan ni manejan datos de tarjeta.
 */
import { z } from "zod";

// ─── API request: crear suscripción ──────────────────────────────────────────
// centerId viene de session.user.centerId (JWT), no del body

export const createSubscriptionBodySchema = z.object({
  planId: z.string().min(1, "planId es requerido"),
});
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;

// ─── API request: cancelar suscripción ──────────────────────────────────────

export const cancelSubscriptionBodySchema = z.object({
  subscriptionId: z.string().min(1, "subscriptionId es requerido"),
});
export type CancelSubscriptionBody = z.infer<typeof cancelSubscriptionBodySchema>;

// ─── Provider DTOs (adapter boundary) ────────────────────────────────────────

/**
 * DTO para crear una preaprobación (suscripción) en MercadoPago.
 * El adapter usa estos datos para llamar a la API de MP.
 */
export interface CreatePreapprovalDto {
  /** Access token del centro (tenant) para MP */
  accessToken: string;
  /** Nombre del plan de suscripción */
  planName: string;
  /** Cantidad a cobrar en la unidad mínima de la moneda (CLP = pesos) */
  amountCents: number;
  /** Código de moneda (ej. "CLP") */
  currency: string;
  /** Frecuencia de cobro (ej. 1 para mensual) */
  frequency: number;
  /** Tipo de frecuencia ("months", "weeks", "days") */
  frequencyType: "months" | "weeks" | "days";
  /** Email del pagador */
  payerEmail: string;
  /** Referencia nuestra para asociar suscripción ↔ nuestro registro */
  externalReference: string;
  /** URL de notificación webhook (por centro) */
  notificationUrl: string;
  /** URL de retorno después de aprobación */
  backUrl: string;
}

/**
 * Resultado de crear una preaprobación.
 */
export interface CreatePreapprovalResultDto {
  success: boolean;
  /** URL de checkout de la suscripción (si success === true) */
  subscriptionUrl?: string;
  /** ID de la preaprobación en MercadoPago (si success === true) */
  mpSubscriptionId?: string;
  error?: string;
}

/**
 * DTO para consultar una preaprobación en MercadoPago.
 */
export interface GetPreapprovalDto {
  accessToken: string;
  mpSubscriptionId: string;
}

/**
 * Estado de una preaprobación desde MercadoPago.
 */
export interface PreapprovalStatusDto {
  /** ID de la preaprobación en MP */
  id: string;
  /** Estado: pending (esperando pagador), authorized (activa), paused, cancelled */
  status: "pending" | "authorized" | "paused" | "cancelled";
  /** ID del pagador en MP (null si no ha autorizado aún) */
  payerId: string | null;
  /** Fecha de creación (ISO 8601) */
  dateCreated: string;
  /** Última modificación (ISO 8601) */
  lastModified: string;
  /** Próxima fecha de cobro (ISO 8601, null si no hay cobros programados) */
  nextPaymentDate: string | null;
}

/**
 * DTO para consultar un pago autorizado (cobro de suscripción).
 */
export interface GetAuthorizedPaymentDto {
  accessToken: string;
  authorizedPaymentId: string;
}

/**
 * Estado de un pago autorizado (cobro de suscripción desde MP).
 */
export interface AuthorizedPaymentStatusDto {
  /** ID del pago en MP */
  id: string;
  /** ID de la preaprobación relacionada */
  preapprovalId: string;
  /** Estado del pago: approved, rejected, pending, cancelled */
  status: "approved" | "rejected" | "pending" | "cancelled";
  /** Monto cobrado en la unidad mínima de la moneda */
  transactionAmount: number;
  /** Fecha de creación del pago (ISO 8601) */
  dateCreated: string;
}

/**
 * DTO para cancelar una preaprobación en MercadoPago.
 */
export interface CancelPreapprovalDto {
  accessToken: string;
  mpSubscriptionId: string;
}

/**
 * Resultado de cancelar una preaprobación.
 */
export interface CancelPreapprovalResultDto {
  success: boolean;
  error?: string;
}
