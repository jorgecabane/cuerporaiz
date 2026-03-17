/**
 * Activa un UserPlan al aprobar una orden.
 * Calcula vigencia según el tipo de plan (por días o por período).
 */
import { planRepository, userPlanRepository } from "@/lib/adapters/db";
import type { Plan, ValidityPeriod } from "@/lib/ports/plan-repository";
import type { UserPlan } from "@/lib/domain/user-plan";

export function computeValidUntil(
  plan: Plan,
  from: Date
): Date | null {
  if (plan.validityDays != null) {
    const until = new Date(from);
    until.setDate(until.getDate() + plan.validityDays);
    return until;
  }
  if (plan.validityPeriod != null) {
    return addPeriod(from, plan.validityPeriod);
  }
  return null;
}

function addPeriod(from: Date, period: ValidityPeriod): Date {
  const d = new Date(from);
  switch (period) {
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "QUADRIMESTRAL":
      d.setMonth(d.getMonth() + 4);
      break;
    case "SEMESTER":
      d.setMonth(d.getMonth() + 6);
      break;
    case "ANNUAL":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export interface ActivatePlanResult {
  success: boolean;
  userPlan?: UserPlan;
  error?: string;
}

/**
 * Crea un UserPlan ACTIVE a partir de una orden aprobada.
 * Idempotente: si ya existe un UserPlan para esa orden, retorna el existente.
 */
export async function activatePlanForOrder(
  orderId: string,
  userId: string,
  planId: string,
  centerId: string
): Promise<ActivatePlanResult> {
  const existing = await userPlanRepository.findByOrderId(orderId);
  if (existing) {
    return { success: true, userPlan: existing };
  }

  const plan = await planRepository.findById(planId);
  if (!plan) {
    return { success: false, error: "Plan no encontrado" };
  }

  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  const userPlan = await userPlanRepository.create({
    userId,
    planId: plan.id,
    centerId,
    orderId,
    paymentStatus: "PAID",
    classesTotal: plan.maxReservations,
    validFrom: now,
    validUntil,
  });

  return { success: true, userPlan };
}
