export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export type EventTicketStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";

export interface Event {
  id: string;
  centerId: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  amountCents: number;
  currency: string;
  maxCapacity: number | null;
  status: EventStatus;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventTicket {
  id: string;
  eventId: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: EventTicketStatus;
  mpPaymentId: string | null;
  orderId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
};
