"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { centerRepository, planRepository, planCategoryQuotaRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import type { PlanCreateInput, PlanUpdateInput } from "@/lib/ports";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

export async function createPlan(
  data: PlanCreateInput & { quotas?: { categoryId: string; maxLessons: number }[] }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  const center = await centerRepository.findById(centerId);
  const existing = await planRepository.findByCenterAndSlug(centerId, data.slug);
  if (existing) {
    redirect(`/panel/planes/nuevo?error=slug`);
  }
  const { quotas, isPopular, ...planData } = data;
  const plan = await planRepository.create(centerId, {
    ...planData,
    currency: planData.currency ?? center?.currency ?? "CLP",
  });
  if (data.type === "ON_DEMAND" && quotas && quotas.length > 0) {
    await planCategoryQuotaRepository.upsertMany(plan.id, quotas);
  }
  if (isPopular) {
    await planRepository.setPopular(plan.id, centerId);
  }
  revalidatePath("/panel/planes");
  redirect("/panel/planes");
}

export async function updatePlan(
  planId: string,
  data: PlanUpdateInput & { quotas?: { categoryId: string; maxLessons: number }[] }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  if (data.slug != null) {
    const conflict = await planRepository.findByCenterAndSlug(centerId, data.slug);
    if (conflict && conflict.id !== planId) redirect(`/panel/planes/${planId}/editar?error=slug`);
  }
  const { quotas, isPopular, ...planData } = data;
  const updated = await planRepository.update(planId, centerId, planData);
  if (!updated) redirect("/panel/planes");
  if (data.type === "ON_DEMAND" && quotas) {
    await planCategoryQuotaRepository.upsertMany(planId, quotas);
  }
  if (isPopular === true) {
    await planRepository.setPopular(planId, centerId);
  } else if (isPopular === false) {
    await planRepository.clearPopular(planId, centerId);
  }
  revalidatePath("/panel/planes");
  revalidatePath("/panel/tienda");
  redirect("/panel/planes");
}

/**
 * Devuelve cuántos UserPlan/Order/Subscription apuntan al plan.
 * Se usa desde el cliente antes de elegir entre eliminar o deshabilitar.
 */
export async function getPlanDependents(planId: string): Promise<number> {
  const centerId = await requireAdminCenterId();
  return planRepository.countDependents(planId, centerId);
}

export async function deletePlan(planId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  const dependents = await planRepository.countDependents(planId, centerId);
  if (dependents > 0) {
    redirect(`/panel/planes?error=has_dependents&planId=${planId}`);
  }
  try {
    const deleted = await planRepository.delete(planId, centerId);
    if (!deleted) redirect("/panel/planes");
  } catch {
    redirect(`/panel/planes?error=delete_failed&planId=${planId}`);
  }
  revalidatePath("/panel/planes");
  revalidatePath("/panel/tienda");
  redirect("/panel/planes");
}

export async function archivePlan(planId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  const archived = await planRepository.archive(planId, centerId);
  if (!archived) redirect("/panel/planes");
  revalidatePath("/panel/planes");
  revalidatePath("/panel/tienda");
  redirect("/panel/planes");
}

export async function unarchivePlan(planId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  const unarchived = await planRepository.unarchive(planId, centerId);
  if (!unarchived) redirect("/panel/planes");
  revalidatePath("/panel/planes");
  revalidatePath("/panel/tienda");
  redirect("/panel/planes");
}

export async function reorderPlans(orderedIds: string[]): Promise<void> {
  const centerId = await requireAdminCenterId();
  await planRepository.reorder(centerId, orderedIds);
  revalidatePath("/panel/planes");
  revalidatePath("/panel/tienda");
}
