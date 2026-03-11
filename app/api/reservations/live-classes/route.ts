import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listLiveClassesUseCase } from "@/lib/application/reserve-class";

/**
 * Lista clases en vivo del centro del usuario autenticado.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const classes = await listLiveClassesUseCase(session.user.centerId);
    return NextResponse.json(classes);
  } catch (err) {
    console.error("[reservations live-classes]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar clases" },
      { status: 500 }
    );
  }
}
