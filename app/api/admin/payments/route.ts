import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { orderRepository, planRepository, centerRepository } from "@/lib/adapters/db";
import { activatePlanForOrder } from "@/lib/application/activate-plan";
import { randomUUID } from "crypto";

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
  const { userId, planId } = body as { userId?: string; planId?: string };

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

  const externalReference = `manual-${randomUUID()}`;
  const order = await orderRepository.create({
    centerId,
    userId,
    planId: plan.id,
    amountCents: plan.amountCents,
    currency: plan.currency,
    externalReference,
  });

  await orderRepository.updateStatus(order.id, "APPROVED");
  await activatePlanForOrder(order.id, userId, plan.id, centerId);

  return NextResponse.json({ orderId: order.id, success: true }, { status: 201 });
}
