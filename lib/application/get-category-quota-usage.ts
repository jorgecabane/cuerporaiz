import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { IPlanCategoryQuotaRepository } from "@/lib/ports/plan-category-quota-repository";

export interface CategoryQuotaUsage {
  categoryId: string;
  maxLessons: number;
  used: number;
  remaining: number;
}

interface GetCategoryQuotaUsageDeps {
  quotaRepo: IPlanCategoryQuotaRepository;
  unlockRepo: ILessonUnlockRepository;
}

export async function getCategoryQuotaUsage(
  planId: string,
  userPlanId: string,
  deps: GetCategoryQuotaUsageDeps,
): Promise<CategoryQuotaUsage[]> {
  const quotas = await deps.quotaRepo.findByPlanId(planId);
  return Promise.all(
    quotas.map(async (q) => {
      const used = await deps.unlockRepo.countByUserPlanAndCategory(userPlanId, q.categoryId);
      return {
        categoryId: q.categoryId,
        maxLessons: q.maxLessons,
        used,
        remaining: Math.max(0, q.maxLessons - used),
      };
    }),
  );
}
