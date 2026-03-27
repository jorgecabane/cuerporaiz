import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userPlanRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: userId, centerId } = session.user;

    // Single query with all joins — no N+1
    const unlockData = await prisma.lessonUnlock.findMany({
      where: { userId, centerId },
      orderBy: { unlockedAt: "desc" },
      include: {
        lesson: {
          include: {
            practice: {
              include: {
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (unlockData.length === 0) return NextResponse.json([]);

    // Check plan validity once for all unlocks
    const userPlans = await userPlanRepository.findActiveByUserAndCenter(userId, centerId);
    const activePlanIds = new Set(
      userPlans
        .filter((up) => up.status === "ACTIVE" && (!up.validUntil || up.validUntil > new Date()))
        .map((up) => up.id),
    );

    const result = unlockData.map((u) => {
      const { lesson } = u;
      const hasAccess = activePlanIds.has(u.userPlanId);

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
        level: lesson.level,
        intensity: lesson.intensity,
        targetAudience: lesson.targetAudience,
        equipment: lesson.equipment,
        tags: lesson.tags,
        thumbnailUrl: lesson.thumbnailUrl,
        promoVideoUrl: lesson.promoVideoUrl,
        videoUrl: hasAccess ? lesson.videoUrl : null,
        sortOrder: lesson.sortOrder,
        status: lesson.status,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
        practiceId: lesson.practiceId,
        unlockedAt: u.unlockedAt,
        hasAccess,
        practiceName: lesson.practice?.name ?? null,
        categoryName: lesson.practice?.category?.name ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[on-demand my-lessons GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
