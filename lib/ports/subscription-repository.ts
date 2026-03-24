import type { Subscription, SubscriptionStatus } from "@/lib/domain/subscription";

export interface CreateSubscriptionInput {
  centerId: string;
  userId: string;
  planId: string;
  mpSubscriptionId: string;
  mpPayerId?: string | null;
  status?: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface ISubscriptionRepository {
  create(input: CreateSubscriptionInput): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByMpSubscriptionId(mpSubscriptionId: string): Promise<Subscription | null>;
  findActiveByUserAndCenter(userId: string, centerId: string): Promise<Subscription[]>;
  updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;
  updatePeriod(id: string, periodStart: Date, periodEnd: Date): Promise<Subscription>;
}
