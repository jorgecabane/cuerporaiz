"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { centerRepository, planRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import type { PlanCreateInput, PlanUpdateInput } from "@/lib/ports";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

export async function createPlan(data: PlanCreateInput): Promise<void> {
  const centerId = await requireAdminCenterId();
  const center = await centerRepository.findById(centerId);
  const existing = await planRepository.findByCenterAndSlug(centerId, data.slug);
  if (existing) {
    redirect(`/panel/planes/nuevo?error=slug`);
  }
  await planRepository.create(centerId, {
    ...data,
    currency: data.currency ?? center?.currency ?? "CLP",
  });
  redirect("/panel/planes");
}

export async function updatePlan(
  planId: string,
  data: PlanUpdateInput
): Promise<void> {
  const centerId = await requireAdminCenterId();
  if (data.slug != null) {
    const conflict = await planRepository.findByCenterAndSlug(centerId, data.slug);
    if (conflict && conflict.id !== planId) redirect(`/panel/planes/${planId}/editar?error=slug`);
  }
  const updated = await planRepository.update(planId, centerId, data);
  if (!updated) redirect("/panel/planes");
  redirect("/panel/planes");
}

export async function deletePlan(planId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  try {
    const deleted = await planRepository.delete(planId, centerId);
    if (!deleted) redirect("/panel/planes");
  } catch {
    redirect("/panel/planes?error=delete_failed");
  }
  redirect("/panel/planes");
}
