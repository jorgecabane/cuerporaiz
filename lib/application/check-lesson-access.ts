import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { IUserPlanRepository } from "@/lib/ports/user-plan-repository";

export interface CheckLessonAccessResult {
  hasAccess: boolean;
  reason?: "NOT_UNLOCKED" | "PLAN_EXPIRED" | "PLAN_INACTIVE";
}

interface CheckLessonAccessDeps {
  unlockRepo: ILessonUnlockRepository;
  userPlanRepo: IUserPlanRepository;
}

export async function checkLessonAccess(
  userId: string,
  lessonId: string,
  deps: CheckLessonAccessDeps,
): Promise<CheckLessonAccessResult> {
  const unlock = await deps.unlockRepo.findByUserAndLesson(userId, lessonId);
  if (!unlock) return { hasAccess: false, reason: "NOT_UNLOCKED" };

  const userPlan = await deps.userPlanRepo.findById(unlock.userPlanId);
  if (!userPlan) return { hasAccess: false, reason: "PLAN_INACTIVE" };
  if (userPlan.status !== "ACTIVE") return { hasAccess: false, reason: "PLAN_INACTIVE" };

  const now = new Date();
  if (userPlan.validUntil && userPlan.validUntil < now) {
    return { hasAccess: false, reason: "PLAN_EXPIRED" };
  }

  return { hasAccess: true };
}
