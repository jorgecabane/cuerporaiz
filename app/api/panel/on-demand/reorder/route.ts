import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";

const reorderSchema = z.object({
  type: z.enum(["category", "practice", "lesson"]),
  orderedIds: z.array(z.string().min(1)).min(1),
});

/**
 * PATCH /api/panel/on-demand/reorder — Reordenar categorías, prácticas o lecciones (solo admin).
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { type, orderedIds } = parsed.data;
    switch (type) {
      case "category":
        await onDemandCategoryRepository.reorder(orderedIds);
        break;
      case "practice":
        await onDemandPracticeRepository.reorder(orderedIds);
        break;
      case "lesson":
        await onDemandLessonRepository.reorder(orderedIds);
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[on-demand reorder PATCH]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
