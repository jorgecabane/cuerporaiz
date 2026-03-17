import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain";
import { userPlanRepository, planRepository } from "@/lib/adapters/db";
import type { PlanPaymentStatus } from "@/lib/domain/user-plan";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, reason, frozenUntil, paymentStatus } = body as {
    action?: string;
    reason?: string;
    frozenUntil?: string;
    paymentStatus?: string;
  };

  const userPlan = await userPlanRepository.findById(id);
  if (!userPlan || userPlan.centerId !== session.user.centerId) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  if (action === "freeze") {
    const plan = await planRepository.findById(userPlan.planId);
    if (plan?.type !== "LIVE") {
      return NextResponse.json(
        { error: "Solo planes Live se pueden congelar" },
        { status: 400 }
      );
    }
    if (!reason) {
      return NextResponse.json({ error: "Motivo requerido" }, { status: 400 });
    }
    const until = frozenUntil ? new Date(frozenUntil) : null;
    const updated = await userPlanRepository.freeze(id, reason, until);
    return NextResponse.json(updated);
  }

  if (action === "unfreeze") {
    const updated = await userPlanRepository.unfreeze(id);
    return NextResponse.json(updated);
  }

  if (action === "cancel") {
    const updated = await userPlanRepository.updateStatus(id, "CANCELLED");
    return NextResponse.json(updated);
  }

  if (action === "update_payment") {
    const valid: PlanPaymentStatus[] = ["PENDING", "PARTIAL", "PAID"];
    if (!paymentStatus || !valid.includes(paymentStatus as PlanPaymentStatus)) {
      return NextResponse.json({ error: "paymentStatus inválido" }, { status: 400 });
    }
    const updated = await userPlanRepository.updatePaymentStatus(id, paymentStatus as PlanPaymentStatus);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
