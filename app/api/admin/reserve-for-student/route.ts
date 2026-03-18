import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { centerRepository } from "@/lib/adapters/db";
import { reserveClassUseCase } from "@/lib/application/reserve-class";
import { reserveClassBodySchema } from "@/lib/dto/reservation-dto";
import { isAdminRole, isInstructorRole, isStudentRole } from "@/lib/domain";

/**
 * Reservar una clase en nombre de un estudiante.
 * Body: { userId, liveClassId, userPlanId? }.
 * Solo administración, o profesor si el centro tiene instructorCanReserveForStudent.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const role = session.user.role;
    const centerId = session.user.centerId;

    if (isAdminRole(role)) {
      // ok
    } else if (isInstructorRole(role)) {
      const center = await centerRepository.findById(centerId);
      if (!center?.instructorCanReserveForStudent) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "No tienes permiso para reservar por estudiantes" },
          { status: 403 }
        );
      }
    } else if (isStudentRole(role)) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo administración y profesores" },
        { status: 403 }
      );
    } else {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Rol inválido" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = reserveClassBodySchema.safeParse({
      liveClassId: body.liveClassId,
      userPlanId: body.userPlanId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const userId = typeof body.userId === "string" ? body.userId : undefined;
    if (!userId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "userId requerido" },
        { status: 400 }
      );
    }

    const result = await reserveClassUseCase(
      userId,
      centerId,
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
        {
          code: result.code,
          message: result.message,
          ...(result.plans ? { plans: result.plans } : {}),
        },
        { status }
      );
    }
    return NextResponse.json(result.reservation, { status: 201 });
  } catch (err) {
    console.error("[admin reserve-for-student]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al reservar" },
      { status: 500 }
    );
  }
}
