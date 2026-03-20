/**
 * Plan activo de un usuario en un centro.
 * Un usuario puede tener múltiples planes activos simultáneamente.
 */

export type UserPlanStatus = "ACTIVE" | "EXPIRED" | "FROZEN" | "CANCELLED";
export type PlanPaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  centerId: string;
  orderId: string | null;
  /** Si no null, este plan fue activado por una suscripción recurrente (MP) */
  subscriptionId: string | null;
  status: UserPlanStatus;
  paymentStatus: PlanPaymentStatus;
  classesTotal: number | null;
  classesUsed: number;
  validFrom: Date;
  validUntil: Date | null;
  frozenAt: Date | null;
  frozenUntil: Date | null;
  freezeReason: string | null;
  unfrozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_PLAN_STATUS_LABELS: Record<UserPlanStatus, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  FROZEN: "Congelado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<PlanPaymentStatus, string> = {
  PENDING: "Por pagar",
  PARTIAL: "Pago parcial",
  PAID: "Pagado",
};

export function isUserPlanUsable(plan: UserPlan, now = new Date()): boolean {
  if (plan.status !== "ACTIVE") return false;
  if (plan.validFrom > now) return false;
  if (plan.validUntil && plan.validUntil < now) return false;
  if (plan.classesTotal !== null && plan.classesUsed >= plan.classesTotal) return false;
  return true;
}

export function classesRemaining(plan: UserPlan): number | null {
  if (plan.classesTotal === null) return null;
  return Math.max(0, plan.classesTotal - plan.classesUsed);
}
