/**
 * Repositorio de planes activos de usuarios.
 */
import type { UserPlan, UserPlanStatus, PlanPaymentStatus } from "@/lib/domain/user-plan";

export type { UserPlan };

export interface CreateUserPlanInput {
  userId: string;
  planId: string;
  centerId: string;
  orderId?: string | null;
  subscriptionId?: string | null;
  paymentStatus?: PlanPaymentStatus;
  classesTotal?: number | null;
  validFrom?: Date;
  validUntil?: Date | null;
}

export interface IUserPlanRepository {
  create(data: CreateUserPlanInput): Promise<UserPlan>;
  findById(id: string): Promise<UserPlan | null>;
  findActiveByUserAndCenter(userId: string, centerId: string): Promise<UserPlan[]>;
  findByUserAndCenter(userId: string, centerId: string): Promise<UserPlan[]>;
  findByOrderId(orderId: string): Promise<UserPlan | null>;
  findActiveBySubscriptionId(subscriptionId: string): Promise<UserPlan | null>;
  incrementClassesUsed(id: string): Promise<UserPlan>;
  decrementClassesUsed(id: string): Promise<UserPlan>;
  updateStatus(id: string, status: UserPlanStatus): Promise<UserPlan>;
  updatePaymentStatus(id: string, paymentStatus: PlanPaymentStatus): Promise<UserPlan>;
  freeze(id: string, reason: string, frozenUntil: Date | null): Promise<UserPlan>;
  unfreeze(id: string): Promise<UserPlan>;
}
