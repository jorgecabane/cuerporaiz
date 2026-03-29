import type { PlanCategoryQuota } from "@/lib/domain/on-demand";

export interface IPlanCategoryQuotaRepository {
  findByPlanId(planId: string): Promise<PlanCategoryQuota[]>;
  findByPlanAndCategory(planId: string, categoryId: string): Promise<PlanCategoryQuota | null>;
  upsertMany(planId: string, quotas: { categoryId: string; maxLessons: number }[]): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
}
