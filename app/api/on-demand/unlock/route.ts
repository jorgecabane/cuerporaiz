import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unlockLessonSchema } from "@/lib/dto/lesson-unlock-dto";
import { unlockLessonUseCase } from "@/lib/application/unlock-lesson";
import {
  onDemandLessonRepository,
  onDemandPracticeRepository,
  onDemandCategoryRepository,
  lessonUnlockRepository,
  userPlanRepository,
  planRepository,
  planCategoryQuotaRepository,
} from "@/lib/adapters/db";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildLessonUnlockedEmail, buildQuotaExhaustedEmail } from "@/lib/email/on-demand";
import { prisma } from "@/lib/adapters/db/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unlockLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }, { status: 400 });
    }

    const userId = session.user.id;
    const centerId = session.user.centerId;

    const result = await unlockLessonUseCase(userId, centerId, parsed.data.lessonId, {
      lessonRepo: onDemandLessonRepository,
      practiceRepo: onDemandPracticeRepository,
      unlockRepo: lessonUnlockRepository,
      userPlanRepo: userPlanRepository,
      planRepo: planRepository,
      quotaRepo: planCategoryQuotaRepository,
    });

    if (!result.success) {
      console.warn("[on-demand unlock] failed:", { userId, lessonId: parsed.data.lessonId, code: result.code });
      const statusMap: Record<string, number> = {
        LESSON_NOT_FOUND: 404,
        PRACTICE_NOT_FOUND: 404,
        NO_ACTIVE_PLAN: 403,
        ALREADY_UNLOCKED: 409,
        QUOTA_EXHAUSTED: 403,
        NO_QUOTA_CONFIGURED: 403,
      };
      return NextResponse.json({ code: result.code }, { status: statusMap[result.code] ?? 400 });
    }

    // Send emails asynchronously
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const lesson = await onDemandLessonRepository.findById(parsed.data.lessonId);
    const practice = lesson ? await onDemandPracticeRepository.findById(lesson.practiceId) : null;
    const category = practice ? await onDemandCategoryRepository.findById(practice.categoryId) : null;

    const pref = await prisma.emailPreference.findUnique({
      where: { userId_centerId: { userId, centerId } },
    });

    if (lesson && practice && category && (!pref || pref.lessonUnlocked)) {
      sendEmailSafe(buildLessonUnlockedEmail({
        toEmail: session.user.email!,
        userName: session.user.name ?? undefined,
        lessonTitle: lesson.title,
        practiceName: practice.name,
        categoryName: category.name,
        remainingLessons: result.remainingLessons ?? null,
        onDemandUrl: `${baseUrl}/panel/on-demand`,
      }));
    }

    if (result.remainingLessons === 0 && category && (!pref || pref.quotaExhausted)) {
      sendEmailSafe(buildQuotaExhaustedEmail({
        toEmail: session.user.email!,
        userName: session.user.name ?? undefined,
        categoryName: category.name,
        storeUrl: `${baseUrl}/panel/tienda`,
      }));
    }

    return NextResponse.json({ success: true, unlock: result.unlock, remainingLessons: result.remainingLessons });
  } catch (err) {
    console.error("[on-demand unlock POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
