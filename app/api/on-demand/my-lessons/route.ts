import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  lessonUnlockRepository,
  onDemandLessonRepository,
  onDemandPracticeRepository,
  onDemandCategoryRepository,
  userPlanRepository,
} from "@/lib/adapters/db";
import { checkLessonAccess } from "@/lib/application/check-lesson-access";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const unlocks = await lessonUnlockRepository.findByUserId(session.user.id);

    const lessons = await Promise.all(
      unlocks.map(async (u) => {
        const lesson = await onDemandLessonRepository.findById(u.lessonId);
        if (!lesson) return null;

        const access = await checkLessonAccess(session.user.id, u.lessonId, {
          unlockRepo: lessonUnlockRepository,
          userPlanRepo: userPlanRepository,
        });

        const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
        const category = practice ? await onDemandCategoryRepository.findById(practice.categoryId) : null;

        return {
          ...lesson,
          videoUrl: access.hasAccess ? lesson.videoUrl : null,
          unlockedAt: u.unlockedAt,
          hasAccess: access.hasAccess,
          practiceName: practice?.name ?? null,
          categoryName: category?.name ?? null,
        };
      }),
    );

    return NextResponse.json(lessons.filter(Boolean));
  } catch (err) {
    console.error("[on-demand my-lessons GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
