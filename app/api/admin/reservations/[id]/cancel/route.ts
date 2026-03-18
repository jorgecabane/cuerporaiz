import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelReservationByStaffUseCase } from "@/lib/application/reserve-class";

/**
 * Cancelar una reserva en nombre de un estudiante (solo administración o profesor del centro).
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const role = session.user.role;
    if (role !== "ADMINISTRATOR" && role !== "INSTRUCTOR") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo administración y profesores" },
        { status: 403 }
      );
    }
    const { id: reservationId } = await params;
    const result = await cancelReservationByStaffUseCase(
      session.user.centerId,
      reservationId
    );
    if (!result.success) {
      const status =
        result.code === "FORBIDDEN"
          ? 403
          : result.code === "RESERVATION_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status }
      );
    }
    return NextResponse.json(result.reservation);
  } catch (err) {
    console.error("[admin reservations cancel]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al cancelar" },
      { status: 500 }
    );
  }
}
