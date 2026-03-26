import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { onDemandCategoryRepository } from "@/lib/adapters/db";
import { createCategorySchema } from "@/lib/dto/on-demand-category-dto";

/**
 * GET /api/panel/on-demand/categories — Listar categorías del centro (solo admin).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }
    const categories = await onDemandCategoryRepository.findByCenterId(session.user.centerId);
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[on-demand categories GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/panel/on-demand/categories — Crear categoría (solo admin).
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
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const category = await onDemandCategoryRepository.create({
      centerId: session.user.centerId,
      ...parsed.data,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("[on-demand categories POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
