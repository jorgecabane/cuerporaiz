import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelReservationUseCase } from "@/lib/application/reserve-class";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const { id: reservationId } = await params;
    const result = await cancelReservationUseCase(
      session.user.id,
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
    console.error("[reservations cancel]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al cancelar" },
      { status: 500 }
    );
  }
}
