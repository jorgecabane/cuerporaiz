import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { onDemandPracticeRepository } from "@/lib/adapters/db";
import { updatePracticeSchema } from "@/lib/dto/on-demand-practice-dto";

/**
 * PATCH /api/panel/on-demand/categories/[id]/practices/[practiceId] — Actualizar práctica (solo admin).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; practiceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const { practiceId } = await params;
    const body = await request.json();
    const parsed = updatePracticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await onDemandPracticeRepository.update(practiceId, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[on-demand practices PATCH]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * DELETE /api/panel/on-demand/categories/[id]/practices/[practiceId] — Eliminar práctica (solo admin).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; practiceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const { practiceId } = await params;
    const deleted = await onDemandPracticeRepository.delete(practiceId);
    if (!deleted) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[on-demand practices DELETE]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
