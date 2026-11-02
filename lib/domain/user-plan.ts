/**
 * Plan activo de un usuario en un centro.
 * Un usuario puede tener múltiples planes activos simultáneamente.
 */

import { DEFAULT_TIMEZONE } from "./center";

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
  | "UPCOMING"
  | "EXPIRED"
  | "EXHAUSTED"
  | "FROZEN"
  | "CANCELLED";

export const DEFAULT_PLAN_EXPIRING_NOTICE_DAYS = 7;

export const PLAN_DISPLAY_STATUS_LABELS: Record<PlanDisplayStatus, string> = {
  ACTIVE: "Activo",
  EXPIRING_SOON: "Vence pronto",
  UPCOMING: "Por comenzar",
  EXPIRED: "Vencido",
  EXHAUSTED: "Sin clases",
  FROZEN: "Congelado",
  CANCELLED: "Cancelado",
};

type DisplayInput = Pick<
  UserPlan,
  "status" | "validFrom" | "validUntil" | "classesTotal" | "classesUsed" | "subscriptionId"
>;

const DAY_MS = 86_400_000;

/** Fecha civil (YYYY-MM-DD) de un instante en una zona horaria. */
function civilDate(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-CA", { timeZone });
}

/** Fecha civil de "hoy + N días" en la zona del centro. */
function civilDateIn(now: Date, days: number, timeZone: string): string {
  return civilDate(new Date(now.getTime() + days * DAY_MS), timeZone);
}

/**
 * Mismas reglas que isUserPlanUsable. "Vence pronto" cuenta días calendario en la zona
 * del centro, igual que el correo (shouldSendExpiringNotice).
 */
export function getPlanDisplayStatus(
  plan: DisplayInput,
  now: Date,
  noticeDays = DEFAULT_PLAN_EXPIRING_NOTICE_DAYS,
  timeZone = DEFAULT_TIMEZONE
): PlanDisplayStatus {
  if (plan.status !== "ACTIVE") return plan.status;
  if (plan.validUntil && plan.validUntil < now) return "EXPIRED";
  if (plan.classesTotal !== null && plan.classesUsed >= plan.classesTotal) return "EXHAUSTED";
  if (plan.validFrom > now) return "UPCOMING";
  const expiresSoon =
    plan.subscriptionId === null &&
    plan.validUntil !== null &&
    civilDate(plan.validUntil, timeZone) <= civilDateIn(now, noticeDays, timeZone);
  return expiresSoon ? "EXPIRING_SOON" : "ACTIVE";
}

/** El plan sirve para reservar. */
export function isPlanCurrent(status: PlanDisplayStatus): boolean {
  return status === "ACTIVE" || status === "EXPIRING_SOON";
}

const isLapsed = (s: PlanDisplayStatus) => s === "EXPIRED" || s === "EXHAUSTED";

/** Último plan que caducó solo (por fecha o clases); para mostrarlo cuando no hay plan vigente. */
export function pickLapsedPlan<T extends DisplayInput & { createdAt: Date }>(plans: T[], now: Date): T | null {
  const lapsed = plans.filter((p) => p.status === "ACTIVE" && isLapsed(getPlanDisplayStatus(p, now)));
  lapsed.sort(
    (a, b) =>
      (b.validUntil?.getTime() ?? Infinity) - (a.validUntil?.getTime() ?? Infinity) ||
      b.createdAt.getTime() - a.createdAt.getTime()
  );
  return lapsed[0] ?? null;
}

/** Plan que aún no empieza, el más próximo. */
function pickUpcomingPlan<T extends DisplayInput>(plans: T[], now: Date): T | null {
  const upcoming = plans.filter((p) => getPlanDisplayStatus(p, now) === "UPCOMING");
  upcoming.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  return upcoming[0] ?? null;
}

/** Qué plan mostrar en un resumen: el vigente; si no, el que viene; si no, el último caducado. */
export function pickShownPlan<T extends DisplayInput & { createdAt: Date }>(
  plans: T[],
  now: Date,
  noticeDays = DEFAULT_PLAN_EXPIRING_NOTICE_DAYS,
  timeZone = DEFAULT_TIMEZONE
): { plan: T; status: PlanDisplayStatus } | null {
  const current = plans.find((p) => isPlanCurrent(getPlanDisplayStatus(p, now, noticeDays, timeZone)));
  const plan = current ?? pickUpcomingPlan(plans, now) ?? pickLapsedPlan(plans, now);
  return plan ? { plan, status: getPlanDisplayStatus(plan, now, noticeDays, timeZone) } : null;
}

/**
 * Mensaje al reservar sin plan vigente (planes LIVE del alumno). Explica si su plan aún no
 * empieza, venció o se quedó sin clases. `onBehalfOfStudent`: reserva el admin por el alumno.
 */
export function noUsablePlanMessage(
  plans: (DisplayInput & { createdAt: Date; planName: string })[],
  now: Date,
  timeZone = DEFAULT_TIMEZONE,
  { onBehalfOfStudent = false } = {}
): string {
  const day = (d: Date) => d.toLocaleDateString("es-CL", { timeZone, day: "numeric", month: "long" });
  const upcoming = pickUpcomingPlan(plans, now);
  if (upcoming) {
    return onBehalfOfStudent
      ? `El plan ${upcoming.planName} del alumno empieza el ${day(upcoming.validFrom)}.`
      : `Tu plan ${upcoming.planName} empieza el ${day(upcoming.validFrom)}.`;
  }
  const lapsed = pickLapsedPlan(plans, now);
  if (!lapsed) {
    return onBehalfOfStudent
      ? "El alumno no tiene un plan activo para reservar clases."
      : "No tienes un plan activo para reservar clases.";
  }
  if (lapsed.validUntil && lapsed.validUntil < now) {
    return onBehalfOfStudent
      ? `El plan ${lapsed.planName} del alumno venció el ${day(lapsed.validUntil)}.`
      : `Tu plan ${lapsed.planName} venció el ${day(lapsed.validUntil)}. Compra otro para seguir reservando.`;
  }
  return onBehalfOfStudent
    ? `El alumno usó todas las clases de su plan ${lapsed.planName}.`
    : `Usaste todas las clases de tu plan ${lapsed.planName}. Compra otro para seguir reservando.`;
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
  return civilDate(plan.validUntil, timeZone) === civilDateIn(now, noticeDays, timeZone);
}
