import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { promoteFromWaitlistUseCase } from "@/lib/application/promote-from-waitlist";

export async function POST(
  request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const { entryId } = await context.params;
    let body: { userPlanId?: string } = {};
    try {
      body = (await request.json()) as { userPlanId?: string };
    } catch {
      // body opcional
    }
    const result = await promoteFromWaitlistUseCase({
      userId: session.user.id,
      entryId,
      userPlanId: body.userPlanId,
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
    console.error("[waitlist promote]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al confirmar el cupo" },
      { status: 500 }
    );
  }
}
