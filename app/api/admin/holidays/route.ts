import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/domain/role";
import { centerHolidayRepository } from "@/lib/adapters/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const holidays = await centerHolidayRepository.findByCenterId(session.user.centerId);

  const result = holidays.map((h) => ({
    id: h.id,
    date: h.date,
    label: h.label,
  }));

  return NextResponse.json(result);
}
