import type { IPlanCategoryQuotaRepository } from "@/lib/ports/plan-category-quota-repository";
import type { PlanCategoryQuota } from "@/lib/domain/on-demand";
import { prisma } from "./prisma";

function toDomain(r: {
  id: string;
  planId: string;
  categoryId: string;
  maxLessons: number;
  createdAt: Date;
  updatedAt: Date;
}): PlanCategoryQuota {
  return {
    id: r.id,
    planId: r.planId,
    categoryId: r.categoryId,
    maxLessons: r.maxLessons,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const planCategoryQuotaRepository: IPlanCategoryQuotaRepository = {
  async findByPlanId(planId: string) {
    const list = await prisma.planCategoryQuota.findMany({
      where: { planId },
      orderBy: { createdAt: "asc" },
    });
    return list.map(toDomain);
  },

  async findByPlanAndCategory(planId: string, categoryId: string) {
    const r = await prisma.planCategoryQuota.findUnique({
      where: { planId_categoryId: { planId, categoryId } },
    });
    return r ? toDomain(r) : null;
  },

  async upsertMany(planId: string, quotas: { categoryId: string; maxLessons: number }[]) {
    await prisma.$transaction([
      prisma.planCategoryQuota.deleteMany({ where: { planId } }),
      prisma.planCategoryQuota.createMany({
        data: quotas.map((q) => ({
          planId,
          categoryId: q.categoryId,
          maxLessons: q.maxLessons,
        })),
      }),
    ]);
  },

  async deleteByPlanId(planId: string) {
    await prisma.planCategoryQuota.deleteMany({ where: { planId } });
  },
};
