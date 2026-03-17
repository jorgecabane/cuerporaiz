import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import {
  markAttendanceUseCase,
  listClassAttendanceUseCase,
} from "@/lib/application/attendance";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = session.user.role;
  if (!isAdminRole(role) && role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Solo admins y profesoras" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
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
  if (!isAdminRole(role) && role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Solo admins y profesoras" }, { status: 403 });
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
