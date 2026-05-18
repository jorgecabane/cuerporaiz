import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { waitlistRepository } from "@/lib/adapters/db";
import { promoteFromWaitlistUseCase } from "@/lib/application/promote-from-waitlist";
import { isStaffRole } from "@/lib/domain/role";

/**
 * Admin/instructor fuerza la promoción manual del usuario dueño de la entry.
 * Útil para "saltar" el FIFO cuando el admin quiere darle el cupo a alguien
 * específico de la cola.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
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
    const { entryId } = await context.params;
    const entry = await waitlistRepository.findById(entryId);
    if (entry === null) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Entry no encontrada" },
        { status: 404 }
      );
    }
    if (entry.centerId !== session.user.centerId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Entry no pertenece a tu centro" },
        { status: 403 }
      );
    }

    const result = await promoteFromWaitlistUseCase({
      userId: entry.userId,
      entryId,
    });
    if (!result.success) {
      const status =
        result.code === "FORBIDDEN"
          ? 403
          : result.code === "NOT_FOUND" || result.code === "ITEM_NOT_FOUND"
            ? 404
            : result.code === "SPOT_TAKEN" || result.code === "CANNOT_PROMOTE"
              ? 409
              : 400;
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status }
      );
    }
    if (result.kind === "class") {
      return NextResponse.json({
        success: true,
        kind: "class",
        reservationId: result.reservationId,
      });
    }
    return NextResponse.json({
      success: true,
      kind: "event",
      eventTicketId: result.eventTicketId,
      heldUntil: result.heldUntil.toISOString(),
    });
  } catch (err) {
    console.error("[admin/waitlist promote]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al promover" },
      { status: 500 }
    );
  }
}
