"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { orderRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

export async function approveOrderManually(formData: FormData): Promise<void> {
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) redirect("/panel/pagos");
  const centerId = await requireAdminCenterId();
  const order = await orderRepository.findById(orderId.trim());
  if (!order || order.centerId !== centerId || order.status !== "PENDING")
    redirect("/panel/pagos");
  await orderRepository.updateStatus(orderId.trim(), "APPROVED");
  redirect("/panel/pagos");
}
