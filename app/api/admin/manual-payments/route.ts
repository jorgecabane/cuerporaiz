import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { prisma } from "@/lib/adapters/db/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });
  }
  const centerId = session.user.centerId;

  const body = await request.json();
  const { userId, userPlanId, amountCents, method, note } = body as {
    userId?: string;
    userPlanId?: string | null;
    amountCents?: number;
    method?: string;
    note?: string;
  };

  if (!userId || !amountCents || amountCents <= 0) {
    return NextResponse.json(
      { error: "userId y amountCents (> 0) requeridos" },
      { status: 400 }
    );
  }

  if (userPlanId) {
    const up = await prisma.userPlan.findUnique({ where: { id: userPlanId } });
    if (!up || up.centerId !== centerId || up.userId !== userId) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }
  }

  const payment = await prisma.manualPayment.create({
    data: {
      centerId,
      userId,
      userPlanId: userPlanId ?? null,
      amountCents,
      method: method ?? "transfer",
      note: note ?? null,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const payments = await prisma.manualPayment.findMany({
    where: { centerId: session.user.centerId, userId },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json(payments);
}
