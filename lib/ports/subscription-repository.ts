/**
 * Repositorio de suscripciones (membresía recurrente por centro).
 */
export type SubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAUSED"
  | "CANCELLED"
  | "PAST_DUE";

export interface Subscription {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  mpPreapprovalId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  pausedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionInput {
  centerId: string;
  userId: string;
  planId: string;
  mpPreapprovalId?: string | null;
}

export interface ISubscriptionRepository {
  create(data: CreateSubscriptionInput): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  /** Active = ACTIVE or PAUSED with access still valid */
  findActiveByUserAndCenter(userId: string, centerId: string): Promise<Subscription | null>;
  findByMpPreapprovalId(preapprovalId: string): Promise<Subscription | null>;
  updateStatus(
    id: string,
    status: SubscriptionStatus,
    period?: { start: Date; end: Date },
    pausedUntil?: Date | null
  ): Promise<Subscription | null>;
  updateMpPreapprovalId(id: string, mpPreapprovalId: string): Promise<Subscription | null>;
}
