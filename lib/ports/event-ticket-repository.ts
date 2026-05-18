import type { EventTicket, EventTicketReferenceMatch, EventTicketStatus } from "@/lib/domain/event";

/** Etiquetas para mostrar en UI. Tipado para que no falte ningún estado. */
export const EVENT_TICKET_STATUS_LABELS: Record<EventTicketStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export interface IEventTicketRepository {
  findById(id: string): Promise<EventTicket | null>;
  findByEventId(eventId: string): Promise<EventTicket[]>;
  findByUserId(userId: string): Promise<EventTicket[]>;
  findByEventAndUser(eventId: string, userId: string): Promise<EventTicket | null>;
  /**
   * Busca un ticket por external_reference de MP. Matchea contra
   * `externalReference` (compra inicial) o `pendingAdditionExternalReference`
   * (re-compra). Devuelve también qué tipo de match fue.
   */
  findByExternalReference(reference: string): Promise<EventTicketReferenceMatch | null>;
  /** Fallback por mpPaymentId ya persistido (por si el webhook reintenta). */
  findByMpPaymentId(mpPaymentId: string): Promise<EventTicket | null>;
  create(data: {
    eventId: string;
    userId: string;
    amountCents: number;
    currency: string;
    quantity?: number;
  }): Promise<EventTicket>;
  /**
   * Reusa un ticket existente (PENDING/CANCELLED) actualizando monto, quantity
   * y status a PENDING. Devuelve el ticket actualizado o `null` si no existe.
   */
  resetPending(
    id: string,
    data: { amountCents: number; quantity: number; currency: string }
  ): Promise<EventTicket | null>;
  /** Setea `externalReference` para mapear webhook → ticket. */
  setExternalReference(id: string, reference: string): Promise<EventTicket | null>;
  /**
   * Setea los campos de re-compra (`pendingAdditionQuantity` y
   * `pendingAdditionExternalReference`). Se llama al crear la preferencia MP
   * de la addition para que el webhook pueda confirmar después.
   */
  setPendingAdditionReference(
    id: string,
    data: { reference: string; quantity: number }
  ): Promise<EventTicket | null>;
  /**
   * Re-compra free: suma `delta` al `quantity` sin pasar por MP. Usado por
   * createEventCheckout cuando event.amountCents === 0.
   */
  incrementQuantity(id: string, delta: number): Promise<EventTicket | null>;
  /**
   * Transacción atómica para webhook approved:
   * - Setea status=PAID, paidAt, mpPaymentId.
   * - Si `isAddition`, suma `pendingAdditionQuantity` a `quantity` y limpia
   *   los campos `pendingAdditionQuantity` / `pendingAdditionExternalReference`.
   * Devuelve `{ ticket, addedQuantity }` (addedQuantity es 0 si no era addition).
   */
  applyApprovedPayment(
    id: string,
    data: { mpPaymentId: string; isAddition: boolean }
  ): Promise<{ ticket: EventTicket; addedQuantity: number } | null>;
  /**
   * Webhook rejected addition: descarta los cupos pendientes (quantity intacto,
   * limpia pendingAdditionQuantity y pendingAdditionExternalReference).
   */
  clearPendingAddition(id: string): Promise<EventTicket | null>;
  updateStatus(
    id: string,
    status: EventTicketStatus,
    extra?: { mpPaymentId?: string; paidAt?: Date }
  ): Promise<EventTicket | null>;
  /**
   * Devuelve la suma de `quantity` de tickets PAID del evento (cupos vendidos).
   */
  countPaidByEventId(eventId: string): Promise<number>;
}
