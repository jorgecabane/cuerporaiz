import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { leaveWaitlistUseCase } from "@/lib/application/leave-waitlist";

export async function DELETE(
  _request: Request,
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
    const result = await leaveWaitlistUseCase({
      userId: session.user.id,
      entryId,
    });
    if (!result.success) {
      const status =
        result.code === "FORBIDDEN"
          ? 403
          : result.code === "NOT_FOUND"
            ? 404
            : 409;
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist DELETE]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al salir de la lista de espera" },
      { status: 500 }
    );
  }
}
