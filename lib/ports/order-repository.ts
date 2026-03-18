/**
 * Orden de compra (checkout). externalReference es nuestro id para MP.
 */
export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED"
  | "CANCELLED";

/** Etiquetas para mostrar en UI. Tipado para que no falte ningún estado. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

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

export interface OrderListFilters {
  status?: OrderStatus;
}

export interface OrderPageFilters {
  status?: OrderStatus;
  email?: string;
  /** Cuando se setea, solo se devuelven órdenes de ese usuario (ej. Mis pagos). */
  userId?: string;
  from?: Date;
  to?: Date;
  page: number;
  take: number;
}

export interface OrderPageResult {
  items: Order[];
  hasMore: boolean;
}

export interface IOrderRepository {
  create(data: CreateOrderInput): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByExternalReference(externalReference: string): Promise<Order | null>;
  findByMpPaymentId(mpPaymentId: string): Promise<Order | null>;
  updateStatus(id: string, status: OrderStatus, mpPaymentId?: string | null): Promise<Order>;
  findManyByCenterId(centerId: string, filters?: OrderListFilters): Promise<Order[]>;
  findPageByCenterId(centerId: string, filters: OrderPageFilters): Promise<OrderPageResult>;
  findManyByUserIdAndCenterId(userId: string, centerId: string): Promise<Order[]>;
}
