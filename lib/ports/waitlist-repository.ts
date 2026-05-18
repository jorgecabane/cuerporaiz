import type { WaitlistEntry } from "@/lib/domain/waitlist-entry";
import type { WaitlistStatus } from "@/lib/domain/waitlist";

export type WaitlistKind = "class" | "event";

export interface CreateWaitlistEntryInput {
  userId: string;
  centerId: string;
  kind: WaitlistKind;
  itemId: string;
}

/**
 * Resultado de promote: éxito (con reservation/ticket creado) o fallo por
 * sobre-cupo (otro promote ganó la transacción).
 */
export type PromoteToReservationResult =
  | { success: true; reservationId: string }
  | { success: false; reason: "spot_taken" };

export type PromoteToEventHoldResult =
  | { success: true; ticketId: string; heldUntil: Date }
  | { success: false; reason: "spot_taken" };

export interface IWaitlistRepository {
  create(input: CreateWaitlistEntryInput): Promise<WaitlistEntry>;

  findById(id: string): Promise<WaitlistEntry | null>;

  findByUserAndItem(
    userId: string,
    kind: WaitlistKind,
    itemId: string
  ): Promise<WaitlistEntry | null>;

  /** Entries activas del usuario (QUEUED | NOTIFIED | HELD). Para tab "Mis listas de espera". */
  findActiveByUserId(userId: string, centerId: string): Promise<WaitlistEntry[]>;

  /** Entries activas de un item, ordenadas por position FIFO. Para broadcast. */
  findActiveByItem(kind: WaitlistKind, itemId: string): Promise<WaitlistEntry[]>;

  /** Para admin: lista todas las entries de un item (incluye terminales si se pide). */
  findByItem(
    kind: WaitlistKind,
    itemId: string,
    options?: { includeTerminal?: boolean }
  ): Promise<WaitlistEntry[]>;

  updateStatus(id: string, status: WaitlistStatus): Promise<WaitlistEntry>;

  /** Marca como NOTIFIED y setea notifiedAt = now. */
  markNotified(id: string, now: Date): Promise<WaitlistEntry>;

  /** Cierra todas las entries activas de una clase (uso: clase cancelada entera). */
  cancelActiveByLiveClassId(liveClassId: string): Promise<WaitlistEntry[]>;

  /** Marca como EXPIRED los HELD vencidos para un evento. Devuelve los ids. */
  expireEventHolds(eventId: string, now: Date): Promise<string[]>;

  /**
   * Atómica: bajo advisory lock por liveClassId, valida cupo y crea Reservation +
   * marca entry como PROMOTED. Si la clase ya está llena, devuelve spot_taken.
   * El use case sigue responsable de validar plan/no-shows ANTES de llamar a esto
   * (la transacción solo protege el conteo, no las reglas de negocio).
   */
  /**
   * Si `userPlanIdToConsume` está seteado, decrementa una clase del plan dentro
   * de la misma transacción que crea la reserva (evita inconsistencias si el
   * incremento falla después). Pasa null si el plan es ilimitado o no aplica.
   */
  promoteToClassReservation(input: {
    entryId: string;
    userId: string;
    liveClassId: string;
    maxCapacity: number;
    userPlanId: string | null;
    userPlanIdToConsume: string | null;
  }): Promise<PromoteToReservationResult>;

  /**
   * Atómica: bajo advisory lock por eventId, valida cupo (PAID + HELD) y crea
   * EventTicket en PENDING + marca entry como HELD con heldUntil.
   * Devuelve spot_taken si ya está lleno.
   */
  promoteToEventHold(input: {
    entryId: string;
    userId: string;
    eventId: string;
    maxCapacity: number;
    amountCents: number;
    currency: string;
    paymentMethod: "MERCADOPAGO" | "TRANSFER";
    holdUntil: Date;
  }): Promise<PromoteToEventHoldResult>;

  /** Cuenta entries en HELD activas (heldUntil > now) para un evento. */
  countActiveHoldsByEventId(eventId: string, now: Date): Promise<number>;
}
