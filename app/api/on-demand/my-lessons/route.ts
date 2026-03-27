import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  lessonUnlockRepository,
  onDemandLessonRepository,
  onDemandPracticeRepository,
  onDemandCategoryRepository,
  userPlanRepository,
} from "@/lib/adapters/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: userId, centerId } = session.user;

    // Batch: get all unlocks for this user+center in one query
    const unlocks = await lessonUnlockRepository.findByUserIdAndCenterId(userId, centerId);

    if (unlocks.length === 0) return NextResponse.json([]);

    // Check plan validity ONCE for all unlocks
    const userPlans = await userPlanRepository.findActiveByUserAndCenter(userId, centerId);
    const activePlanIds = new Set(
      userPlans
        .filter((up) => up.status === "ACTIVE" && (!up.validUntil || up.validUntil > new Date()))
        .map((up) => up.id),
    );

    // Batch fetch all lessons in parallel
    const lessons = await Promise.all(unlocks.map((u) => onDemandLessonRepository.findById(u.lessonId)));

    // Batch fetch practices (deduplicated)
    const practiceIds = [...new Set(lessons.filter(Boolean).map((l) => l!.practiceId))];
    const practices = await Promise.all(practiceIds.map((id) => onDemandPracticeRepository.findById(id)));
    const practiceMap = new Map(practices.filter(Boolean).map((p) => [p!.id, p!]));

    // Batch fetch categories (deduplicated)
    const categoryIds = [...new Set(practices.filter(Boolean).map((p) => p!.categoryId))];
    const categoryResults = await Promise.all(categoryIds.map((id) => onDemandCategoryRepository.findById(id)));
    const categoryMap = new Map(categoryResults.filter(Boolean).map((c) => [c!.id, c!]));

    const result = unlocks
      .map((u, i) => {
        const lesson = lessons[i];
        if (!lesson) return null;

        const hasAccess = activePlanIds.has(u.userPlanId);
        const practice = practiceMap.get(lesson.practiceId);
        const category = practice ? categoryMap.get(practice.categoryId) : null;

        return {
          ...lesson,
          videoUrl: hasAccess ? lesson.videoUrl : null,
          unlockedAt: u.unlockedAt,
          hasAccess,
          practiceName: practice?.name ?? null,
          categoryName: category?.name ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[on-demand my-lessons GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
