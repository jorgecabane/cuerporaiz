import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listLiveClassesPaginated,
  listLiveClassesByRange,
} from "@/lib/application/reserve-class";

/**
 * Lista clases en vivo del centro del usuario autenticado.
 * Query: page, pageSize (paginado) O from + to (ISO, rango de fechas para vista semanal).
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
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (fromParam && toParam) {
      const from = new Date(fromParam);
      const to = new Date(toParam);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "from y to deben ser fechas ISO válidas con from < to" },
          { status: 400 }
        );
      }
      const items = await listLiveClassesByRange(session.user.centerId, from, to);
      return NextResponse.json({ items, total: items.length, page: 1, pageSize: items.length });
    }
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;
    const result = await listLiveClassesPaginated(session.user.centerId, { page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[reservations live-classes]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar clases" },
      { status: 500 }
    );
  }
}
