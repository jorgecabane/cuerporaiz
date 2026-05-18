export interface ManualPaymentListItem {
  id: string;
  centerId: string;
  userId: string;
  userPlanId: string | null;
  planName: string | null;
  eventTicketId: string | null;
  eventTitle: string | null;
  amountCents: number;
  currency: string;
  method: string;
  note: string | null;
  paidAt: Date;
  createdAt: Date;
}

export interface ManualPaymentPageFilters {
  email?: string;
  /** Cuando se setea, solo se devuelven pagos de ese usuario (ej. Mis pagos). */
  userId?: string;
  /**
   * Acota por tipo de ítem pagado:
   * - "plan"  → pagos con userPlanId no nulo
   * - "event" → pagos con eventTicketId no nulo
   * - ausente → todos (incluye pagos sueltos sin ninguna FK)
   */
  paymentKind?: "plan" | "event";
  from?: Date;
  to?: Date;
  page: number;
  take: number;
}

export interface ManualPaymentPageResult {
  items: ManualPaymentListItem[];
  hasMore: boolean;
}

export interface IManualPaymentRepository {
  findPageByCenterId(centerId: string, filters: ManualPaymentPageFilters): Promise<ManualPaymentPageResult>;
}

