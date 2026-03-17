export interface ManualPaymentListItem {
  id: string;
  centerId: string;
  userId: string;
  userPlanId: string | null;
  planName: string | null;
  amountCents: number;
  currency: string;
  method: string;
  note: string | null;
  paidAt: Date;
  createdAt: Date;
}

export interface ManualPaymentPageFilters {
  email?: string;
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

