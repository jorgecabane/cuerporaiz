import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { onDemandPracticeRepository } from "@/lib/adapters/db";
import { createPracticeSchema } from "@/lib/dto/on-demand-practice-dto";

/**
 * GET /api/panel/on-demand/categories/[id]/practices — Listar prácticas de categoría (solo admin).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const { id } = await params;
    const practices = await onDemandPracticeRepository.findByCategoryId(id);
    return NextResponse.json(practices);
  } catch (err) {
    console.error("[on-demand practices GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/panel/on-demand/categories/[id]/practices — Crear práctica (solo admin).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = createPracticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const practice = await onDemandPracticeRepository.create({
      categoryId: id,
      ...parsed.data,
    });
    return NextResponse.json(practice, { status: 201 });
  } catch (err) {
    console.error("[on-demand practices POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
