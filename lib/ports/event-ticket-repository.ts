import type { EventTicket, EventTicketStatus } from "@/lib/domain/event";

export interface IEventTicketRepository {
  findByEventId(eventId: string): Promise<EventTicket[]>;
  findByUserId(userId: string): Promise<EventTicket[]>;
  findByEventAndUser(eventId: string, userId: string): Promise<EventTicket | null>;
  create(data: { eventId: string; userId: string; amountCents: number; currency: string }): Promise<EventTicket>;
  updateStatus(
    id: string,
    status: EventTicketStatus,
    extra?: { mpPaymentId?: string; paidAt?: Date }
  ): Promise<EventTicket | null>;
  countPaidByEventId(eventId: string): Promise<number>;
}
