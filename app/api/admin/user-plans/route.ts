import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { userPlanRepository, planRepository } from "@/lib/adapters/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Solo administración" }, { status: 403 });
  }
  const centerId = session.user.centerId;

  const body = await request.json();
  const { userId, planId, validFrom: validFromStr } = body as {
    userId?: string;
    planId?: string;
    validFrom?: string;
  };

  if (!userId || !planId) {
    return NextResponse.json(
      { error: "userId y planId requeridos" },
      { status: 400 }
    );
  }

  const plan = await planRepository.findById(planId);
  if (!plan || plan.centerId !== centerId) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const { computeValidUntil } = await import("@/lib/application/activate-plan");
  const from = validFromStr ? new Date(validFromStr) : new Date();
  const validUntil = computeValidUntil(plan, from);

  const userPlan = await userPlanRepository.create({
    userId,
    planId: plan.id,
    centerId,
    orderId: null,
    paymentStatus: "PENDING",
    classesTotal: plan.maxReservations,
    validFrom: from,
    validUntil,
  });

  return NextResponse.json(userPlan, { status: 201 });
}
