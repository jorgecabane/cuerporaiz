/**
 * Lista de espera (waitlist) para clases en vivo y eventos.
 * Modelo polimórfico: exactamente uno de liveClassId o eventId está seteado.
 */

export type WaitlistStatus =
  | "QUEUED"
  | "NOTIFIED"
  | "HELD"
  | "PROMOTED"
  | "EXPIRED"
  | "CANCELLED";

export const WAITLIST_STATUSES: WaitlistStatus[] = [
  "QUEUED",
  "NOTIFIED",
  "HELD",
  "PROMOTED",
  "EXPIRED",
  "CANCELLED",
];

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  QUEUED: "En cola",
  NOTIFIED: "Notificado",
  HELD: "Cupo reservado",
  PROMOTED: "Confirmado",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

/** Minutos mínimos entre correos a la misma entry para no hacer spam. */
export const WAITLIST_NOTIFY_THROTTLE_MIN = 10;

/** Minutos que dura el hold de un cupo de evento durante checkout. */
export const EVENT_HOLD_MINUTES = 15;

const ACTIVE_STATUSES = new Set<WaitlistStatus>(["QUEUED", "NOTIFIED", "HELD"]);
const TERMINAL_STATUSES = new Set<WaitlistStatus>(["PROMOTED", "EXPIRED", "CANCELLED"]);
const PROMOTABLE_STATUSES = new Set<WaitlistStatus>(["QUEUED", "NOTIFIED"]);

/** La entry sigue ocupando un slot en la cola (no ha terminado). */
export function isActiveWaitlistStatus(status: WaitlistStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

/** Estado terminal: no hay más transiciones posibles. */
export function isTerminalWaitlistStatus(status: WaitlistStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Puede iniciar promoción: estaba esperando o recibió correo. */
export function canPromoteWaitlistEntry(status: WaitlistStatus): boolean {
  return PROMOTABLE_STATUSES.has(status);
}

/**
 * Invariante polimórfico: exactamente uno de liveClassId / eventId debe ser non-null.
 * El schema Prisma lo permite ambos opcionales, pero el dominio lo restringe.
 */
export function validateWaitlistInvariant(input: {
  liveClassId: string | null;
  eventId: string | null;
}): void {
  const hasClass = input.liveClassId !== null;
  const hasEvent = input.eventId !== null;
  if (hasClass === hasEvent) {
    throw new Error(
      "WaitlistEntry inválido: exactamente uno de liveClassId o eventId debe estar seteado"
    );
  }
}

/**
 * ¿Hay que saltarse el envío por throttle? (último correo hace < N minutos)
 */
export function shouldThrottleNotification(
  notifiedAt: Date | null,
  now: Date
): boolean {
  if (notifiedAt === null) return false;
  const diffMin = (now.getTime() - notifiedAt.getTime()) / 60_000;
  return diffMin < WAITLIST_NOTIFY_THROTTLE_MIN;
}
