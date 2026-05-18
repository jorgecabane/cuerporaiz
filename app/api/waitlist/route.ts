import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinWaitlistUseCase } from "@/lib/application/join-waitlist";
import { joinWaitlistBodySchema } from "@/lib/dto/waitlist-dto";

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
    const parsed = joinWaitlistBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const result = await joinWaitlistUseCase({
      userId: session.user.id,
      centerId: session.user.centerId,
      kind: parsed.data.kind,
      itemId: parsed.data.itemId,
    });
    if (!result.success) {
      const status =
        result.code === "FORBIDDEN"
          ? 403
          : result.code === "ITEM_NOT_FOUND" || result.code === "CENTER_NOT_FOUND"
            ? 404
            : result.code === "ALREADY_IN_WAITLIST" || result.code === "HAS_SPOTS"
              ? 409
              : 400;
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status }
      );
    }
    return NextResponse.json(result.entry, { status: 201 });
  } catch (err) {
    console.error("[waitlist POST]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al unirse a la lista de espera" },
      { status: 500 }
    );
  }
}
