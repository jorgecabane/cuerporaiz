import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandCategoryRepository,
  onDemandLessonRepository,
  onDemandPracticeRepository,
} from "@/lib/adapters/db";
import { updateLessonSchema } from "@/lib/dto/on-demand-lesson-dto";

/**
 * PATCH /api/panel/on-demand/lessons/[id] — Actualizar lección (solo admin).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const { id } = await params;
    const lesson = await onDemandLessonRepository.findById(id);
    if (!lesson) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (!practice) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    const category = await onDemandCategoryRepository.findById(practice.categoryId);
    if (!category || category.centerId !== session.user.centerId) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    const body = await request.json();
    const parsed = updateLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await onDemandLessonRepository.update(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[on-demand lessons PATCH]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * DELETE /api/panel/on-demand/lessons/[id] — Eliminar lección (solo admin).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const { id } = await params;
    const lesson = await onDemandLessonRepository.findById(id);
    if (!lesson) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (!practice) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    const category = await onDemandCategoryRepository.findById(practice.categoryId);
    if (!category || category.centerId !== session.user.centerId) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    const deleted = await onDemandLessonRepository.delete(id);
    if (!deleted) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[on-demand lessons DELETE]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
