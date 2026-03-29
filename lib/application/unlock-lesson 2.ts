import type { IOnDemandLessonRepository } from "@/lib/ports/on-demand-lesson-repository";
import type { IOnDemandPracticeRepository } from "@/lib/ports/on-demand-practice-repository";
import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { IUserPlanRepository } from "@/lib/ports/user-plan-repository";
import type { IPlanRepository } from "@/lib/ports/plan-repository";
import type { IPlanCategoryQuotaRepository } from "@/lib/ports/plan-category-quota-repository";
import type { LessonUnlock } from "@/lib/domain/on-demand";
import { isUserPlanUsable } from "@/lib/domain/user-plan";

export interface UnlockLessonResult {
  success: boolean;
  code:
    | "UNLOCKED"
    | "LESSON_NOT_FOUND"
    | "PRACTICE_NOT_FOUND"
    | "NO_ACTIVE_PLAN"
    | "ALREADY_UNLOCKED"
    | "QUOTA_EXHAUSTED"
    | "NO_QUOTA_CONFIGURED";
  unlock?: LessonUnlock;
  remainingLessons?: number | null;
  lessonTitle?: string;
  practiceName?: string;
  categoryId?: string;
}

interface UnlockLessonDeps {
  lessonRepo: IOnDemandLessonRepository;
  practiceRepo: IOnDemandPracticeRepository;
  unlockRepo: ILessonUnlockRepository;
  userPlanRepo: IUserPlanRepository;
  planRepo: IPlanRepository;
  quotaRepo: IPlanCategoryQuotaRepository;
}

export async function unlockLessonUseCase(
  userId: string,
  centerId: string,
  lessonId: string,
  deps: UnlockLessonDeps
): Promise<UnlockLessonResult> {
  const { lessonRepo, practiceRepo, unlockRepo, userPlanRepo, planRepo, quotaRepo } = deps;

  // 1. Validate lesson exists
  const lesson = await lessonRepo.findById(lessonId);
  if (!lesson) {
    return { success: false, code: "LESSON_NOT_FOUND" };
  }

  // 2. Get practice to determine category
  const practice = await practiceRepo.findById(lesson.practiceId);
  if (!practice) {
    return { success: false, code: "PRACTICE_NOT_FOUND" };
  }

  // 3. Find usable on-demand plan
  const activePlans = await userPlanRepo.findActiveByUserAndCenter(userId, centerId);
  let selectedPlan = null;
  let selectedPlanType = null;

  for (const up of activePlans) {
    if (!isUserPlanUsable(up)) continue;
    const plan = await planRepo.findById(up.planId);
    if (!plan) continue;
    if (plan.type !== "ON_DEMAND" && plan.type !== "MEMBERSHIP_ON_DEMAND") continue;
    selectedPlan = up;
    selectedPlanType = plan.type;
    break;
  }

  if (!selectedPlan || !selectedPlanType) {
    return { success: false, code: "NO_ACTIVE_PLAN" };
  }

  // 4. Check not already unlocked
  const existing = await unlockRepo.findByUserAndLesson(userId, lessonId);
  if (existing) {
    return { success: false, code: "ALREADY_UNLOCKED" };
  }

  // 5. For ON_DEMAND: check quota
  let remainingLessons: number | null = null;

  if (selectedPlanType === "ON_DEMAND") {
    const quota = await quotaRepo.findByPlanAndCategory(selectedPlan.planId, practice.categoryId);
    if (!quota) {
      return { success: false, code: "NO_QUOTA_CONFIGURED" };
    }

    const used = await unlockRepo.countByUserPlanAndCategory(selectedPlan.id, practice.categoryId);
    if (used >= quota.maxLessons) {
      return { success: false, code: "QUOTA_EXHAUSTED" };
    }

    remainingLessons = quota.maxLessons - used - 1;
  }

  // 6. Create unlock record — wrap in try/catch to handle concurrent duplicate inserts
  // (unique constraint on userId_lessonId) that slip through the pre-check.
  let unlock: LessonUnlock;
  try {
    unlock = await unlockRepo.create({
      userId,
      lessonId,
      userPlanId: selectedPlan.id,
      centerId,
    });
  } catch {
    return { success: false, code: "ALREADY_UNLOCKED" };
  }

  return {
    success: true,
    code: "UNLOCKED",
    unlock,
    remainingLessons,
    lessonTitle: lesson.title,
    practiceName: practice.name,
    categoryId: practice.categoryId,
  };
}
