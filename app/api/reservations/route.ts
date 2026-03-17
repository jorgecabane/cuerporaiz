import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMyReservationsPaginated } from "@/lib/application/reserve-class";
import { reserveClassBodySchema, listReservationsQuerySchema } from "@/lib/dto/reservation-dto";
import { reserveClassUseCase } from "@/lib/application/reserve-class";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
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
    const result = await listMyReservationsPaginated(session.user.id, session.user.centerId, {
      page: query.data.page,
      pageSize: query.data.pageSize,
      statuses: query.data.statuses,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[reservations GET]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar reservas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const body = await request.json();
    const parsed = reserveClassBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const result = await reserveClassUseCase(
      session.user.id,
      session.user.centerId,
      parsed.data.liveClassId,
      parsed.data.userPlanId
    );
    if (!result.success) {
      const status =
        result.code === "FORBIDDEN"
          ? 403
          : result.code === "LIVE_CLASS_NOT_FOUND" || result.code === "RESERVATION_NOT_FOUND"
            ? 404
            : result.code === "NO_SPOTS" || result.code === "ALREADY_RESERVED"
              ? 409
              : result.code === "PLAN_SELECTION_REQUIRED"
                ? 422
                : 400;
      return NextResponse.json(
        { code: result.code, message: result.message, ...(result.plans ? { plans: result.plans } : {}) },
        { status }
      );
    }
    return NextResponse.json(result.reservation, { status: 201 });
  } catch (err) {
    console.error("[reservations POST]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al reservar" },
      { status: 500 }
    );
  }
}
