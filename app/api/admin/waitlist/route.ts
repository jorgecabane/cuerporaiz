import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminListWaitlistUseCase } from "@/lib/application/admin-list-waitlist";
import { adminListWaitlistQuerySchema } from "@/lib/dto/waitlist-dto";
import { isStaffRole } from "@/lib/domain/role";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    if (session.user.role === undefined || !isStaffRole(session.user.role)) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo administración y profesores" },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const query = adminListWaitlistQuerySchema.safeParse({
      liveClassId: searchParams.get("liveClassId") ?? undefined,
      eventId: searchParams.get("eventId") ?? undefined,
    });
    if (!query.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Parámetros inválidos" },
        { status: 400 }
      );
    }
    const kind = query.data.liveClassId !== undefined ? "class" : "event";
    const itemId = query.data.liveClassId ?? query.data.eventId!;
    const result = await adminListWaitlistUseCase({
      centerId: session.user.centerId,
      kind,
      itemId,
    });
    if (!result.success) {
      const status = result.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status }
      );
    }
    return NextResponse.json({ entries: result.entries });
  } catch (err) {
    console.error("[admin/waitlist GET]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar la lista de espera" },
      { status: 500 }
    );
  }
}
