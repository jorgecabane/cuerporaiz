"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { orderRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { isAdminRole } from "@/lib/domain";
import { activatePlanForOrder } from "@/lib/application/activate-plan";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

const METHODS = ["transfer", "cash", "other"] as const;

export async function approveOrderManually(formData: FormData): Promise<void> {
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) redirect("/panel/pagos");
  const methodRaw = formData.get("method");
  const method = typeof methodRaw === "string" && METHODS.includes(methodRaw as (typeof METHODS)[number])
    ? (methodRaw as (typeof METHODS)[number])
    : "transfer";
  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  const centerId = await requireAdminCenterId();
  const order = await orderRepository.findById(orderId.trim());
  if (!order || order.centerId !== centerId || order.status !== "PENDING")
    redirect("/panel/pagos");

  await orderRepository.updateStatus(orderId.trim(), "APPROVED");
  const result = await activatePlanForOrder(order.id, order.userId, order.planId, order.centerId);
  if (result.success && result.userPlan) {
    await prisma.manualPayment.create({
      data: {
        centerId,
        userId: order.userId,
        userPlanId: result.userPlan.id,
        amountCents: order.amountCents,
        currency: order.currency,
        method,
        note,
      },
    });
  }
  redirect("/panel/pagos");
}
