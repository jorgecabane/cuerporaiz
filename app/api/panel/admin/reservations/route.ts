import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCenterReservationsPaginated } from "@/lib/application/reserve-class";
import { listReservationsQuerySchema } from "@/lib/dto/reservation-dto";
import { isAdminRole } from "@/lib/domain";

/**
 * GET /api/panel/admin/reservations — Listar reservas del centro (solo admin).
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo administración" },
        { status: 403 }
      );
    }
    const centerId = session.user.centerId;
    const { searchParams } = new URL(request.url);
    const query = listReservationsQuerySchema.safeParse({
      statuses: searchParams.get("statuses") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!query.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Parámetros inválidos", errors: query.error.flatten() },
        { status: 400 }
      );
    }
    const result = await listCenterReservationsPaginated(centerId, {
      page: query.data.page,
      pageSize: query.data.pageSize,
      statuses: query.data.statuses,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin reservations GET]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar reservas" },
      { status: 500 }
    );
  }
}
