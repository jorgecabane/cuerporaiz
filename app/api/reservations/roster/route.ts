import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listClassRosterUseCase, listClassRostersUseCase } from "@/lib/application/class-roster";
import { classRosterQuerySchema, liveClassIdsQuerySchema, MAX_BATCH_CLASS_IDS } from "@/lib/dto/class-roster-dto";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Lote: ?liveClassIds=a,b,c → { [liveClassId]: roster[] } (una llamada por día del calendario).
  const idsParam = searchParams.get("liveClassIds");
  if (idsParam !== null) {
    const ids = liveClassIdsQuerySchema.safeParse(idsParam);
    if (!ids.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: `liveClassIds inválido (1 a ${MAX_BATCH_CLASS_IDS} ids)` },
        { status: 400 }
      );
    }
    const batch = await listClassRostersUseCase(ids.data, session.user.centerId);
    if (!batch.success) return NextResponse.json({ code: batch.code, message: batch.message }, { status: 403 });
    return NextResponse.json(batch.rosters);
  }

  const parsed = classRosterQuerySchema.safeParse({
    liveClassId: searchParams.get("liveClassId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "liveClassId requerido" },
      { status: 400 }
    );
  }

  const result = await listClassRosterUseCase(parsed.data.liveClassId, session.user.centerId);
  if (!result.success) {
    const status = result.code === "ROSTER_DISABLED" ? 403 : 404;
    return NextResponse.json({ code: result.code, message: result.message }, { status });
  }

  return NextResponse.json(result.roster);
}
