/**
 * Suscripción recurrente de un usuario en un centro.
 * Gestiona pagos automáticos periódicos vía MercadoPago.
 */

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "PAYMENT_FAILED";

export interface Subscription {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  mpSubscriptionId: string;
  mpPayerId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
  PAYMENT_FAILED: "Pago fallido",
};

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "ACTIVE";
}
