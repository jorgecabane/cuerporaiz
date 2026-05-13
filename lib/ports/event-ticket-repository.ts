import type { EventTicket, EventTicketStatus } from "@/lib/domain/event";

export interface IEventTicketRepository {
  findById(id: string): Promise<EventTicket | null>;
  findByEventId(eventId: string): Promise<EventTicket[]>;
  findByUserId(userId: string): Promise<EventTicket[]>;
  findByEventAndUser(eventId: string, userId: string): Promise<EventTicket | null>;
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
