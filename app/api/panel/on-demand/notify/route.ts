import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandCategoryRepository,
  onDemandLessonRepository,
  onDemandPracticeRepository,
  prisma,
} from "@/lib/adapters/db";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildNewContentEmail } from "@/lib/email/on-demand";

const notifySchema = z.object({
  lessonId: z.string().min(1),
});

/**
 * POST /api/panel/on-demand/notify — Notificar nuevo contenido a usuarios con plan activo (solo admin).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const centerId = session.user.centerId;
    const body = await request.json();
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { lessonId } = parsed.data;
    const lesson = await onDemandLessonRepository.findById(lessonId);
    if (!lesson) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (!practice) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    const category = await onDemandCategoryRepository.findById(practice.categoryId);
    if (!category || category.centerId !== centerId) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const activePlans = await prisma.userPlan.findMany({
      where: {
        centerId,
        status: "ACTIVE",
        plan: { type: { in: ["ON_DEMAND", "MEMBERSHIP_ON_DEMAND"] } },
      },
      include: {
        user: {
          include: { emailPreferences: { where: { centerId } } },
        },
      },
    });

    const catalogUrl = `${process.env.NEXTAUTH_URL ?? ""}/on-demand`;

    let notified = 0;
    const seenUserIds = new Set<string>();

    for (const userPlan of activePlans) {
      const user = userPlan.user;
      if (seenUserIds.has(user.id)) continue;
      seenUserIds.add(user.id);

      const prefs = user.emailPreferences[0];
      const wantsNewContent = prefs?.newContent ?? true;
      if (!wantsNewContent || !user.email) continue;

      await sendEmailSafe(
        buildNewContentEmail({
          toEmail: user.email,
          userName: user.name ?? undefined,
          lessonTitle: lesson.title,
          practiceName: practice.name,
          catalogUrl,
        })
      );
      notified++;
    }

    return NextResponse.json({ ok: true, notified });
  } catch (err) {
    console.error("[on-demand notify POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
