import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/domain/role";
import { prisma } from "@/lib/adapters/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const classes = await prisma.liveClass.findMany({
    where: {
      centerId: session.user.centerId,
      status: "ACTIVE",
      startsAt: { gte: new Date(from), lt: new Date(to) },
    },
    select: {
      id: true,
      centerId: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      maxCapacity: true,
      disciplineId: true,
      instructorId: true,
      isOnline: true,
      isTrialClass: true,
      trialCapacity: true,
      color: true,
      seriesId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      discipline: { select: { color: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const result = classes.map((c) => ({
    id: c.id,
    centerId: c.centerId,
    title: c.title,
    startsAt: c.startsAt,
    durationMinutes: c.durationMinutes,
    maxCapacity: c.maxCapacity,
    disciplineId: c.disciplineId,
    instructorId: c.instructorId,
    isOnline: c.isOnline,
    isTrialClass: c.isTrialClass,
    trialCapacity: c.trialCapacity,
    color: c.color ?? c.discipline?.color ?? null,
    seriesId: c.seriesId,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json(result);
}
