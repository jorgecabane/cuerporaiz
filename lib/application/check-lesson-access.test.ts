import { describe, it, expect, vi } from "vitest";
import { checkLessonAccess } from "./check-lesson-access";
import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { IUserPlanRepository } from "@/lib/ports/user-plan-repository";
import type { UserPlan } from "@/lib/domain/user-plan";
import type { LessonUnlock } from "@/lib/domain/on-demand";

function makeUserPlan(overrides: Partial<UserPlan> = {}): UserPlan {
  return {
    id: "up-1",
    userId: "user-1",
    planId: "plan-1",
    centerId: "center-1",
    orderId: null,
    subscriptionId: null,
    status: "ACTIVE",
    paymentStatus: "PAID",
    classesTotal: null,
    classesUsed: 0,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    frozenAt: null,
    frozenUntil: null,
    freezeReason: null,
    unfrozenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const unlock: LessonUnlock = {
  id: "ul-1",
  userId: "user-1",
  lessonId: "lesson-1",
  userPlanId: "up-1",
  centerId: "center-1",
  unlockedAt: new Date(),
};

function makeUnlockRepo(overrides: Partial<ILessonUnlockRepository> = {}): ILessonUnlockRepository {
  return {
    findByUserId: vi.fn(),
    findByUserAndLesson: vi.fn(),
    countByUserPlanAndCategory: vi.fn(),
    create: vi.fn(),
    ...overrides,
  };
}

function makeUserPlanRepo(overrides: Partial<IUserPlanRepository> = {}): IUserPlanRepository {
  return {
    findById: vi.fn(),
    findActiveByUserAndCenter: vi.fn(),
    findByUserAndCenter: vi.fn(),
    findByOrderId: vi.fn(),
    findActiveBySubscriptionId: vi.fn(),
    create: vi.fn(),
    incrementClassesUsed: vi.fn(),
    decrementClassesUsed: vi.fn(),
    updateStatus: vi.fn(),
    updatePaymentStatus: vi.fn(),
    freeze: vi.fn(),
    unfreeze: vi.fn(),
    ...overrides,
  };
}

describe("checkLessonAccess", () => {
  it("grants access when unlock exists, plan is ACTIVE and not expired", async () => {
    const unlockRepo = makeUnlockRepo({
      findByUserAndLesson: vi.fn().mockResolvedValue(unlock),
    });
    const userPlanRepo = makeUserPlanRepo({
      findById: vi.fn().mockResolvedValue(makeUserPlan()),
    });

    const result = await checkLessonAccess("user-1", "lesson-1", { unlockRepo, userPlanRepo });

    expect(result).toEqual({ hasAccess: true });
  });

  it("denies access when unlock exists but plan is expired (validUntil in past)", async () => {
    const unlockRepo = makeUnlockRepo({
      findByUserAndLesson: vi.fn().mockResolvedValue(unlock),
    });
    const userPlanRepo = makeUserPlanRepo({
      findById: vi.fn().mockResolvedValue(makeUserPlan({ validUntil: new Date("2025-01-01") })),
    });

    const result = await checkLessonAccess("user-1", "lesson-1", { unlockRepo, userPlanRepo });

    expect(result).toEqual({ hasAccess: false, reason: "PLAN_EXPIRED" });
  });

  it("denies access when unlock exists but plan status is FROZEN", async () => {
    const unlockRepo = makeUnlockRepo({
      findByUserAndLesson: vi.fn().mockResolvedValue(unlock),
    });
    const userPlanRepo = makeUserPlanRepo({
      findById: vi.fn().mockResolvedValue(makeUserPlan({ status: "FROZEN" })),
    });

    const result = await checkLessonAccess("user-1", "lesson-1", { unlockRepo, userPlanRepo });

    expect(result).toEqual({ hasAccess: false, reason: "PLAN_INACTIVE" });
  });

  it("denies access when no unlock exists", async () => {
    const unlockRepo = makeUnlockRepo({
      findByUserAndLesson: vi.fn().mockResolvedValue(null),
    });
    const userPlanRepo = makeUserPlanRepo();

    const result = await checkLessonAccess("user-1", "lesson-1", { unlockRepo, userPlanRepo });

    expect(result).toEqual({ hasAccess: false, reason: "NOT_UNLOCKED" });
  });
});
