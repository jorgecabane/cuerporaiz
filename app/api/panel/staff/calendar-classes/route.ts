import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { listLiveClassesByRange } from "@/lib/application/reserve-class";
import { instructorRepository } from "@/lib/adapters/db";

/**
 * Clases en vivo para staff (profe o admin) en un rango de fechas.
 * Admin: todas las clases del centro. Profe: solo las suyas.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const role = session.user.role;
    if (role !== "ADMINISTRATOR" && role !== "INSTRUCTOR") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo profesoras y administradoras" },
        { status: 403 }
      );
    }
    const centerId = session.user.centerId;
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "from y to (ISO) requeridos" },
        { status: 400 }
      );
    }
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "from y to deben ser fechas válidas con from < to" },
        { status: 400 }
      );
    }

    let instructorId: string | undefined;
    if (role === "INSTRUCTOR") {
      const instructors = await instructorRepository.findByCenterId(centerId);
      const me = instructors.find((i) => i.userId === session.user.id);
      if (!me) {
        return NextResponse.json({ items: [], total: 0 });
      }
      instructorId = me.id;
    }

    const items = await listLiveClassesByRange(centerId, from, to, instructorId);
    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    console.error("[panel staff calendar-classes]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar clases" },
      { status: 500 }
    );
  }
}
