/**
 * Plan activo de un usuario en un centro.
 * Un usuario puede tener múltiples planes activos simultáneamente.
 */

export type UserPlanStatus = "ACTIVE" | "EXPIRED" | "FROZEN" | "CANCELLED";

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  centerId: string;
  orderId: string | null;
  status: UserPlanStatus;
  classesTotal: number | null;
  classesUsed: number;
  validFrom: Date;
  validUntil: Date | null;
  frozenAt: Date | null;
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

export function isUserPlanUsable(plan: UserPlan, now = new Date()): boolean {
  if (plan.status !== "ACTIVE") return false;
  if (plan.validUntil && plan.validUntil < now) return false;
  if (plan.classesTotal !== null && plan.classesUsed >= plan.classesTotal) return false;
  return true;
}

export function classesRemaining(plan: UserPlan): number | null {
  if (plan.classesTotal === null) return null;
  return Math.max(0, plan.classesTotal - plan.classesUsed);
}
