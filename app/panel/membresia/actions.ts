"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { subscriptionRepository } from "@/lib/adapters/db";
import { mercadopagoConfigRepository } from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";

export async function cancelMembresia(subscriptionId: string) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const sub = await subscriptionRepository.findById(subscriptionId);
  if (!sub || sub.userId !== session.user.id) redirect("/panel/membresia");
  const config = await mercadopagoConfigRepository.findByCenterId(sub.centerId);
  if (!config?.enabled || !sub.mpPreapprovalId) {
    redirect("/panel/membresia?error=no-mp");
  }
  const result = await mercadoPagoSubscriptionAdapter.cancelSubscription({
    accessToken: config.accessToken,
    preapprovalId: sub.mpPreapprovalId,
  });
  if (!result.success) redirect(`/panel/membresia?error=${encodeURIComponent(result.error ?? "cancel")}`);
  await subscriptionRepository.updateStatus(sub.id, "CANCELLED");
  revalidatePath("/panel/membresia");
  redirect("/panel/membresia");
}

/** Pausa hasta 1 mes (v1). endDate = hoy + 1 mes. */
export async function pauseMembresia(subscriptionId: string) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const sub = await subscriptionRepository.findById(subscriptionId);
  if (!sub || sub.userId !== session.user.id) redirect("/panel/membresia");
  const config = await mercadopagoConfigRepository.findByCenterId(sub.centerId);
  if (!config?.enabled || !sub.mpPreapprovalId) {
    redirect("/panel/membresia?error=no-mp");
  }
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);
  const result = await mercadoPagoSubscriptionAdapter.pauseSubscription({
    accessToken: config.accessToken,
    preapprovalId: sub.mpPreapprovalId,
    endDate: endDate.toISOString().slice(0, 10),
  });
  if (!result.success) redirect(`/panel/membresia?error=${encodeURIComponent(result.error ?? "pause")}`);
  await subscriptionRepository.updateStatus(sub.id, "PAUSED", undefined, endDate);
  revalidatePath("/panel/membresia");
  redirect("/panel/membresia");
}
