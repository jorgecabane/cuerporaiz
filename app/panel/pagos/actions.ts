"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { orderRepository } from "@/lib/adapters/db";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || session.user.role !== "ADMINISTRADORA") {
    redirect("/panel");
  }
  return session.user.centerId;
}

export async function approveOrderManually(orderId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  const order = await orderRepository.findById(orderId);
  if (!order || order.centerId !== centerId || order.status !== "PENDING")
    redirect("/panel/pagos");
  await orderRepository.updateStatus(orderId, "APPROVED");
  redirect("/panel/pagos");
}
