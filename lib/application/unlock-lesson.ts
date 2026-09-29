import type { IOnDemandLessonRepository } from "@/lib/ports/on-demand-lesson-repository";
import type { IOnDemandPracticeRepository } from "@/lib/ports/on-demand-practice-repository";
import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { IUserPlanRepository } from "@/lib/ports/user-plan-repository";
import type { IPlanRepository } from "@/lib/ports/plan-repository";
import type { IPlanCategoryQuotaRepository } from "@/lib/ports/plan-category-quota-repository";
import type { LessonUnlock } from "@/lib/domain/on-demand";
import type { UserPlan } from "@/lib/domain/user-plan";
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

  // 3. Find usable on-demand plans
  const activePlans = await userPlanRepo.findActiveByUserAndCenter(userId, centerId);
  const candidates: { userPlan: UserPlan; type: "ON_DEMAND" | "MEMBERSHIP_ON_DEMAND" }[] = [];
  for (const up of activePlans) {
    if (!isUserPlanUsable(up)) continue;
    const plan = await planRepo.findById(up.planId);
    if (plan?.type === "ON_DEMAND" || plan?.type === "MEMBERSHIP_ON_DEMAND") {
      candidates.push({ userPlan: up, type: plan.type });
    }
  }

  if (candidates.length === 0) {
    return { success: false, code: "NO_ACTIVE_PLAN" };
  }

  // 4. Check not already unlocked
  const existing = await unlockRepo.findByUserAndLesson(userId, lessonId);
  if (existing) {
    return { success: false, code: "ALREADY_UNLOCKED" };
  }

  // 5. Pick the plan that covers this category: a membership (no quota to spend)
  // or else the first ON_DEMAND pack with lessons left for this category.
  const membership = candidates.find((c) => c.type === "MEMBERSHIP_ON_DEMAND");
  let selectedPlan: UserPlan | null = membership?.userPlan ?? null;
  let remainingLessons: number | null = null;
  let hasQuotaForCategory = false;

  if (!selectedPlan) {
    for (const { userPlan } of candidates) {
      const quota = await quotaRepo.findByPlanAndCategory(userPlan.planId, practice.categoryId);
      if (!quota) continue;
      hasQuotaForCategory = true;
      const used = await unlockRepo.countByUserPlanAndCategory(userPlan.id, practice.categoryId);
      if (used < quota.maxLessons) {
        selectedPlan = userPlan;
        remainingLessons = quota.maxLessons - used - 1;
        break;
      }
    }
  }

  if (!selectedPlan) {
    return { success: false, code: hasQuotaForCategory ? "QUOTA_EXHAUSTED" : "NO_QUOTA_CONFIGURED" };
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
