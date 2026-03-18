import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageRaw = searchParams.get("page");
    const pageSizeRaw = searchParams.get("pageSize");
    const page = pageRaw ? Number(pageRaw) : 1;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : DEFAULT_PAGE_SIZE;

    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json({ error: "page inválido" }, { status: 400 });
    }
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: `pageSize inválido (1-${MAX_PAGE_SIZE})` },
        { status: 400 }
      );
    }

    const centerId = session.user.centerId;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.userCenterRole.findMany({
        where: { centerId, role: "STUDENT" },
        select: {
          userId: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { user: { email: "asc" } },
        take: pageSize,
        skip,
      }),
      prisma.userCenterRole.count({
        where: { centerId, role: "STUDENT" },
      }),
    ]);

    return NextResponse.json({
      items: items.map((m) => ({
        id: m.userId,
        name: m.user.name ?? null,
        email: m.user.email,
      })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[admin clients GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

