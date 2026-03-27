import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockLessonUseCase } from "./unlock-lesson";
import type { UserPlan } from "@/lib/domain/user-plan";
import type { Plan } from "@/lib/ports/plan-repository";
import type { OnDemandLesson, OnDemandPractice, LessonUnlock } from "@/lib/domain/on-demand";

// --- Factory helpers ---

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
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validUntil: new Date("2027-01-01T00:00:00Z"),
    frozenAt: null,
    frozenUntil: null,
    freezeReason: null,
    unfrozenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    centerId: "center-1",
    name: "Plan On Demand",
    slug: "plan-on-demand",
    description: null,
    amountCents: 5000,
    currency: "CLP",
    type: "ON_DEMAND",
    validityDays: 30,
    validityPeriod: null,
    billingMode: null,
    recurringDiscountPercent: null,
    maxReservations: null,
    maxReservationsPerDay: null,
    maxReservationsPerWeek: null,
    ...overrides,
  };
}

function makeLesson(overrides: Partial<OnDemandLesson> = {}): OnDemandLesson {
  return {
    id: "lesson-1",
    practiceId: "practice-1",
    title: "Lección de yoga",
    description: null,
    videoUrl: "https://example.com/video.mp4",
    promoVideoUrl: null,
    thumbnailUrl: null,
    durationMinutes: 45,
    level: null,
    intensity: null,
    targetAudience: null,
    equipment: null,
    tags: null,
    sortOrder: 1,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePractice(overrides: Partial<OnDemandPractice> = {}): OnDemandPractice {
  return {
    id: "practice-1",
    categoryId: "cat-1",
    name: "Práctica base",
    description: null,
    thumbnailUrl: null,
    sortOrder: 1,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLessonUnlock(overrides: Partial<LessonUnlock> = {}): LessonUnlock {
  return {
    id: "unlock-1",
    userId: "user-1",
    lessonId: "lesson-1",
    userPlanId: "up-1",
    centerId: "center-1",
    unlockedAt: new Date(),
    ...overrides,
  };
}

// --- Mock repos ---

function makeDeps() {
  return {
    lessonRepo: {
      findById: vi.fn(),
      findByPracticeId: vi.fn(),
      findPublishedByPracticeId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    },
    practiceRepo: {
      findById: vi.fn(),
      findByCategoryId: vi.fn(),
      findPublishedByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    },
    unlockRepo: {
      findByUserId: vi.fn(),
      findByUserIdAndCenterId: vi.fn(),
      findByUserAndLesson: vi.fn(),
      countByUserPlanAndCategory: vi.fn(),
      create: vi.fn(),
    },
    userPlanRepo: {
      create: vi.fn(),
      findById: vi.fn(),
      findActiveByUserAndCenter: vi.fn(),
      findByUserAndCenter: vi.fn(),
      findByOrderId: vi.fn(),
      findActiveBySubscriptionId: vi.fn(),
      incrementClassesUsed: vi.fn(),
      decrementClassesUsed: vi.fn(),
      updateStatus: vi.fn(),
      updatePaymentStatus: vi.fn(),
      freeze: vi.fn(),
      unfreeze: vi.fn(),
    },
    planRepo: {
      findById: vi.fn(),
      findManyByIds: vi.fn(),
      findByCenterAndSlug: vi.fn(),
      findManyByCenterId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    quotaRepo: {
      findByPlanId: vi.fn(),
      findByPlanAndCategory: vi.fn(),
      upsertMany: vi.fn(),
      deleteByPlanId: vi.fn(),
    },
  };
}

// --- Tests ---

describe("unlockLessonUseCase", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
    vi.clearAllMocks();
  });

  it("desbloquea lección con plan ON_DEMAND y cuota disponible", async () => {
    const lesson = makeLesson();
    const practice = makePractice();
    const userPlan = makeUserPlan({ classesTotal: null });
    const plan = makePlan({ type: "ON_DEMAND" });
    const unlock = makeLessonUnlock();

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([userPlan]);
    deps.planRepo.findById.mockResolvedValue(plan);
    deps.unlockRepo.findByUserAndLesson.mockResolvedValue(null);
    deps.quotaRepo.findByPlanAndCategory.mockResolvedValue({ id: "q-1", planId: "plan-1", categoryId: "cat-1", maxLessons: 5, createdAt: new Date(), updatedAt: new Date() });
    deps.unlockRepo.countByUserPlanAndCategory.mockResolvedValue(2);
    deps.unlockRepo.create.mockResolvedValue(unlock);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(true);
    expect(result.code).toBe("UNLOCKED");
    expect(result.unlock).toEqual(unlock);
    expect(result.remainingLessons).toBe(2); // 5 - 2 - 1 = 2
    expect(deps.unlockRepo.create).toHaveBeenCalledOnce();
  });

  it("rechaza si no hay plan activo", async () => {
    const lesson = makeLesson();
    const practice = makePractice();

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([]);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(false);
    expect(result.code).toBe("NO_ACTIVE_PLAN");
  });

  it("rechaza si plan está vencido", async () => {
    const lesson = makeLesson();
    const practice = makePractice();
    const expiredUserPlan = makeUserPlan({ validUntil: new Date("2020-01-01T00:00:00Z") });
    const plan = makePlan({ type: "ON_DEMAND" });

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([expiredUserPlan]);
    deps.planRepo.findById.mockResolvedValue(plan);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(false);
    expect(result.code).toBe("NO_ACTIVE_PLAN");
  });

  it("rechaza si plan está congelado", async () => {
    const lesson = makeLesson();
    const practice = makePractice();
    const frozenUserPlan = makeUserPlan({ status: "FROZEN" });
    const plan = makePlan({ type: "ON_DEMAND" });

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([frozenUserPlan]);
    deps.planRepo.findById.mockResolvedValue(plan);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(false);
    expect(result.code).toBe("NO_ACTIVE_PLAN");
  });

  it("rechaza si cuota agotada", async () => {
    const lesson = makeLesson();
    const practice = makePractice();
    const userPlan = makeUserPlan({ classesTotal: null });
    const plan = makePlan({ type: "ON_DEMAND" });

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([userPlan]);
    deps.planRepo.findById.mockResolvedValue(plan);
    deps.unlockRepo.findByUserAndLesson.mockResolvedValue(null);
    deps.quotaRepo.findByPlanAndCategory.mockResolvedValue({ id: "q-1", planId: "plan-1", categoryId: "cat-1", maxLessons: 3, createdAt: new Date(), updatedAt: new Date() });
    deps.unlockRepo.countByUserPlanAndCategory.mockResolvedValue(3);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(false);
    expect(result.code).toBe("QUOTA_EXHAUSTED");
  });

  it("no valida cuota para MEMBERSHIP_ON_DEMAND", async () => {
    const lesson = makeLesson();
    const practice = makePractice();
    const userPlan = makeUserPlan({ classesTotal: null });
    const plan = makePlan({ type: "MEMBERSHIP_ON_DEMAND" });
    const unlock = makeLessonUnlock();

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([userPlan]);
    deps.planRepo.findById.mockResolvedValue(plan);
    deps.unlockRepo.findByUserAndLesson.mockResolvedValue(null);
    deps.unlockRepo.create.mockResolvedValue(unlock);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(true);
    expect(result.code).toBe("UNLOCKED");
    expect(deps.quotaRepo.findByPlanAndCategory).not.toHaveBeenCalled();
  });

  it("rechaza si ya desbloqueada", async () => {
    const lesson = makeLesson();
    const practice = makePractice();
    const userPlan = makeUserPlan({ classesTotal: null });
    const plan = makePlan({ type: "ON_DEMAND" });
    const existingUnlock = makeLessonUnlock();

    deps.lessonRepo.findById.mockResolvedValue(lesson);
    deps.practiceRepo.findById.mockResolvedValue(practice);
    deps.userPlanRepo.findActiveByUserAndCenter.mockResolvedValue([userPlan]);
    deps.planRepo.findById.mockResolvedValue(plan);
    deps.unlockRepo.findByUserAndLesson.mockResolvedValue(existingUnlock);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(false);
    expect(result.code).toBe("ALREADY_UNLOCKED");
  });

  it("rechaza si lección no existe", async () => {
    deps.lessonRepo.findById.mockResolvedValue(null);

    const result = await unlockLessonUseCase("user-1", "center-1", "lesson-1", deps);

    expect(result.success).toBe(false);
    expect(result.code).toBe("LESSON_NOT_FOUND");
  });
});
