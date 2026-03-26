import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { onDemandLessonRepository } from "@/lib/adapters/db";
import { createLessonSchema } from "@/lib/dto/on-demand-lesson-dto";

/**
 * POST /api/panel/on-demand/lessons — Crear lección (solo admin).
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
    const body = await request.json();
    const parsed = createLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const lesson = await onDemandLessonRepository.create(parsed.data);
    return NextResponse.json(lesson, { status: 201 });
  } catch (err) {
    console.error("[on-demand lessons POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
