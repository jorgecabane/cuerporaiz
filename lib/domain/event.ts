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
  isOnline: boolean;
  /** Link real de la reunión. Sólo panel admin y la redirección del link personal. */
  meetingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventTicket {
  id: string;
  eventId: string;
  userId: string;
  amountCents: number;
  quantity: number;
  currency: string;
  status: EventTicketStatus;
  mpPaymentId: string | null;
  externalReference: string | null;
  pendingAdditionQuantity: number;
  pendingAdditionExternalReference: string | null;
  /** Token de acceso público para compras guest (sin login). Null si autenticado. */
  claimToken: string | null;
  orderId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface EventTicketReferenceMatch {
  ticket: EventTicket;
  isAddition: boolean;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
};

/** Un cupo de una entrada a evento online, con su link personal. */
export interface EventAttendee {
  id: string;
  ticketId: string;
  seat: number;
  token: string;
  name: string | null;
  email: string | null;
  firstEnteredAt: Date | null;
  lastEnteredAt: Date | null;
  revokedAt: Date | null;
}
