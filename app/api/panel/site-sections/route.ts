import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { siteSectionRepository } from "@/lib/adapters/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const centerId = session.user.centerId;

  const sections = await siteSectionRepository.findByCenterId(centerId);
  return NextResponse.json(sections);
}
