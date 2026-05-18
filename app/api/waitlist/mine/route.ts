import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMyWaitlistUseCase } from "@/lib/application/list-my-waitlist";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const entries = await listMyWaitlistUseCase(
      session.user.id,
      session.user.centerId
    );
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[waitlist/mine GET]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar tus listas de espera" },
      { status: 500 }
    );
  }
}
