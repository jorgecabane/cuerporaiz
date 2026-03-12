/**
 * DTOs para suscripciones (membresía recurrente) con MercadoPago.
 * La aplicación trabaja solo con estos tipos; el adapter traduce a/desde la API de MP.
 */
import { z } from "zod";

// ─── Crear suscripción (preapproval MP) ─────────────────────────────────────

export interface CreateSubscriptionDto {
  accessToken: string;
  reason: string;
  /** Monto por período en unidad mínima (centavos CLP) */
  transactionAmount: number;
  currencyId: string;
  /** Email del suscriptor */
  payerEmail: string;
  /** Frecuencia: cada N meses */
  frequency: number;
  frequencyType: "months";
  /** URLs de retorno tras autorizar en MP */
  backUrlSuccess: string;
  backUrlFailure: string;
  backUrlPending: string;
  /** URL de notificación para eventos de la suscripción */
  notificationUrl: string;
  /** Referencia nuestra (ej. subscriptionId) */
  externalReference: string;
}

export const createSubscriptionDtoSchema = z.object({
  accessToken: z.string().min(1),
  reason: z.string().min(1),
  transactionAmount: z.number().int().min(0),
  currencyId: z.string().length(3),
  payerEmail: z.string().email(),
  frequency: z.number().int().min(1),
  frequencyType: z.literal("months"),
  backUrlSuccess: z.string().url(),
  backUrlFailure: z.string().url(),
  backUrlPending: z.string().url(),
  notificationUrl: z.string().url(),
  externalReference: z.string().min(1),
});

export interface CreateSubscriptionResultDto {
  success: boolean;
  checkoutUrl?: string;
  preapprovalId?: string;
  error?: string;
}

// ─── Re-consulta preapproval en MP ───────────────────────────────────────────

export interface GetPreapprovalDto {
  accessToken: string;
  preapprovalId: string;
}

export type PreapprovalStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "pending_payment";

export interface PreapprovalStatusDto {
  id: string;
  status: PreapprovalStatus;
  payerEmail?: string;
  initPoint?: string;
  dateCreated?: string;
  dateLastApproved?: string;
  /** End date of current billing period (ISO) */
  nextPaymentDate?: string;
}

// ─── Pausar / cancelar ───────────────────────────────────────────────────────

export interface PauseSubscriptionDto {
  accessToken: string;
  preapprovalId: string;
  /** End date of pause (ISO date string). Max 1 month for v1. */
  endDate: string;
}

export interface CancelSubscriptionDto {
  accessToken: string;
  preapprovalId: string;
}
