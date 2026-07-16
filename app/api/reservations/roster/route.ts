import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listClassRosterUseCase } from "@/lib/application/class-roster";
import { classRosterQuerySchema } from "@/lib/dto/class-roster-dto";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
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
