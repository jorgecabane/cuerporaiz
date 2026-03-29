import { describe, it, expect, vi } from "vitest";
import { getCategoryQuotaUsage } from "./get-category-quota-usage";
import type { IPlanCategoryQuotaRepository } from "@/lib/ports/plan-category-quota-repository";
import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { PlanCategoryQuota } from "@/lib/domain/on-demand";

function makeQuotaRepo(overrides: Partial<IPlanCategoryQuotaRepository> = {}): IPlanCategoryQuotaRepository {
  return {
    findByPlanId: vi.fn(),
    findByPlanAndCategory: vi.fn(),
    upsertMany: vi.fn(),
    deleteByPlanId: vi.fn(),
    ...overrides,
  };
}

function makeUnlockRepo(overrides: Partial<ILessonUnlockRepository> = {}): ILessonUnlockRepository {
  return {
    findByUserId: vi.fn(),
    findByUserIdAndCenterId: vi.fn(),
    findByUserAndLesson: vi.fn(),
    countByUserPlanAndCategory: vi.fn(),
    create: vi.fn(),
    ...overrides,
  };
}

function makeQuota(overrides: Partial<PlanCategoryQuota> = {}): PlanCategoryQuota {
  return {
    id: "q-1",
    planId: "plan-1",
    categoryId: "cat-1",
    maxLessons: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getCategoryQuotaUsage", () => {
  it("calculates used and remaining correctly for multiple quotas", async () => {
    const quotas = [
      makeQuota({ id: "q-1", categoryId: "cat-1", maxLessons: 5 }),
      makeQuota({ id: "q-2", categoryId: "cat-2", maxLessons: 3 }),
    ];
    const quotaRepo = makeQuotaRepo({
      findByPlanId: vi.fn().mockResolvedValue(quotas),
    });
    const unlockRepo = makeUnlockRepo({
      countByUserPlanAndCategory: vi.fn()
        .mockResolvedValueOnce(2)  // cat-1: 2 used
        .mockResolvedValueOnce(3), // cat-2: 3 used (all used)
    });

    const result = await getCategoryQuotaUsage("plan-1", "up-1", { quotaRepo, unlockRepo });

    expect(result).toEqual([
      { categoryId: "cat-1", maxLessons: 5, used: 2, remaining: 3 },
      { categoryId: "cat-2", maxLessons: 3, used: 3, remaining: 0 },
    ]);
  });

  it("returns empty array when no quotas are configured", async () => {
    const quotaRepo = makeQuotaRepo({
      findByPlanId: vi.fn().mockResolvedValue([]),
    });
    const unlockRepo = makeUnlockRepo();

    const result = await getCategoryQuotaUsage("plan-1", "up-1", { quotaRepo, unlockRepo });

    expect(result).toEqual([]);
  });
});
