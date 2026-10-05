import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole, isInstructorRole } from "@/lib/domain";
import {
  markAttendanceUseCase,
  listClassAttendanceUseCase,
  listAttendanceForClassesUseCase,
} from "@/lib/application/attendance";
import { liveClassIdsQuerySchema, MAX_BATCH_CLASS_IDS } from "@/lib/dto/class-roster-dto";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = session.user.role;
  if (!isAdminRole(role) && !isInstructorRole(role)) {
    return NextResponse.json({ error: "Solo administración y profesores" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  // Lote: ?liveClassIds=a,b,c → { [liveClassId]: attendees[] } (una llamada por día del calendario).
  const idsParam = searchParams.get("liveClassIds");
  if (idsParam !== null) {
    const ids = liveClassIdsQuerySchema.safeParse(idsParam);
    if (!ids.success) {
      return NextResponse.json({ error: `liveClassIds inválido (1 a ${MAX_BATCH_CLASS_IDS} ids)` }, { status: 400 });
    }
    return NextResponse.json(await listAttendanceForClassesUseCase(ids.data, session.user.centerId));
  }

  const liveClassId = searchParams.get("liveClassId");
  if (!liveClassId) {
    return NextResponse.json({ error: "liveClassId requerido" }, { status: 400 });
  }

  const result = await listClassAttendanceUseCase(liveClassId, session.user.centerId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result.attendees);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = session.user.role;
  if (!isAdminRole(role) && !isInstructorRole(role)) {
    return NextResponse.json({ error: "Solo administración y profesores" }, { status: 403 });
  }

  const body = await request.json();
  const { reservationId, status } = body as { reservationId?: string; status?: string };

  if (!reservationId || !status || !["ATTENDED", "NO_SHOW"].includes(status)) {
    return NextResponse.json({ error: "reservationId y status (ATTENDED|NO_SHOW) requeridos" }, { status: 400 });
  }

  const result = await markAttendanceUseCase({
    reservationId,
    centerId: session.user.centerId,
    status: status as "ATTENDED" | "NO_SHOW",
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
