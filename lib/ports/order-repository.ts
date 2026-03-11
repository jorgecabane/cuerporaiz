/**
 * Orden de compra (checkout). externalReference es nuestro id para MP.
 */
export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED"
  | "CANCELLED";

export interface Order {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  externalReference: string;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  centerId: string;
  userId: string;
  planId: string;
  amountCents: number;
  currency: string;
  externalReference: string;
  mpPreferenceId?: string | null;
}

export interface IOrderRepository {
  create(data: CreateOrderInput): Promise<Order>;
  findByExternalReference(externalReference: string): Promise<Order | null>;
  findByMpPaymentId(mpPaymentId: string): Promise<Order | null>;
  updateStatus(id: string, status: OrderStatus, mpPaymentId?: string | null): Promise<Order>;
}
