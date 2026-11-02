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

/** Estado que ve la gente: el guardado + fechas y clases (nada escribe EXPIRED en la BD). */
export type PlanDisplayStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "EXHAUSTED"
  | "FROZEN"
  | "CANCELLED";

export const DEFAULT_PLAN_EXPIRING_NOTICE_DAYS = 7;

export const PLAN_DISPLAY_STATUS_LABELS: Record<PlanDisplayStatus, string> = {
  ACTIVE: "Activo",
  EXPIRING_SOON: "Vence pronto",
  EXPIRED: "Vencido",
  EXHAUSTED: "Sin clases",
  FROZEN: "Congelado",
  CANCELLED: "Cancelado",
};

type DisplayInput = Pick<UserPlan, "status" | "validUntil" | "classesTotal" | "classesUsed" | "subscriptionId">;

const DAY_MS = 86_400_000;

export function getPlanDisplayStatus(plan: DisplayInput, now: Date, noticeDays: number): PlanDisplayStatus {
  if (plan.status !== "ACTIVE") return plan.status;
  if (plan.validUntil && plan.validUntil < now) return "EXPIRED";
  if (plan.classesTotal !== null && plan.classesUsed >= plan.classesTotal) return "EXHAUSTED";
  const expiresSoon =
    plan.subscriptionId === null &&
    plan.validUntil !== null &&
    plan.validUntil.getTime() - now.getTime() <= noticeDays * DAY_MS;
  return expiresSoon ? "EXPIRING_SOON" : "ACTIVE";
}

/** El plan sirve para reservar. */
export function isPlanCurrent(status: PlanDisplayStatus): boolean {
  return status === "ACTIVE" || status === "EXPIRING_SOON";
}

/** Último plan que caducó solo (por fecha o clases); para mostrarlo cuando no hay plan vigente. */
export function pickLapsedPlan<T extends DisplayInput & { createdAt: Date }>(plans: T[], now: Date): T | null {
  const lapsed = plans.filter((p) => {
    if (p.status !== "ACTIVE") return false;
    const s = getPlanDisplayStatus(p, now, 0);
    return s === "EXPIRED" || s === "EXHAUSTED";
  });
  lapsed.sort(
    (a, b) =>
      (b.validUntil?.getTime() ?? Infinity) - (a.validUntil?.getTime() ?? Infinity) ||
      b.createdAt.getTime() - a.createdAt.getTime()
  );
  return lapsed[0] ?? null;
}

/** Mensaje al reservar sin plan vigente cuando el último plan caducó solo. */
export function lapsedPlanMessage(
  plan: { planName: string; status: PlanDisplayStatus; validUntil: Date | null },
  timeZone: string
): string {
  if (plan.status === "EXPIRED" && plan.validUntil) {
    const date = plan.validUntil.toLocaleDateString("es-CL", { timeZone, day: "numeric", month: "long" });
    return `Tu plan ${plan.planName} venció el ${date}. Compra otro para seguir reservando.`;
  }
  return `Usaste todas las clases de tu plan ${plan.planName}. Compra otro para seguir reservando.`;
}

/** Fecha civil (YYYY-MM-DD) de un instante en una zona horaria. */
function civilDate(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Correo "Tu plan vence pronto": el cron corre una vez al día y avisa a los planes que
 * vencen exactamente N días calendario después (en la zona del centro). Comparar fechas
 * civiles, no una ventana de horas, evita saltarse o repetir planes si la corrida se atrasa.
 * Solo planes no recurrentes y con clases restantes.
 */
export function shouldSendExpiringNotice(
  plan: Pick<UserPlan, "validUntil" | "classesTotal" | "classesUsed" | "subscriptionId">,
  now: Date,
  noticeDays: number,
  timeZone: string
): boolean {
  if (!plan.validUntil || plan.subscriptionId !== null) return false;
  if (plan.classesTotal !== null && plan.classesUsed >= plan.classesTotal) return false;
  const target = new Date(now.getTime() + noticeDays * DAY_MS);
  return civilDate(plan.validUntil, timeZone) === civilDate(target, timeZone);
}
