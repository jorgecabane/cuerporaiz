"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  onDemandCategoryRepository,
} from "@/lib/adapters/db";
import type { OnDemandContentStatus } from "@/lib/domain/on-demand";
import { requireAdminCenterId } from "@/lib/server/require-admin";

export async function createCategory(data: {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status?: OnDemandContentStatus;
}): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandCategoryRepository.create({ centerId, ...data });
  revalidatePath("/panel/on-demand/categorias");
  redirect("/panel/on-demand/categorias");
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    status?: OnDemandContentStatus;
  }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandCategoryRepository.update(id, centerId, data);
  revalidatePath("/panel/on-demand/categorias");
  revalidatePath(`/panel/on-demand/categorias/${id}`);
}

export async function deleteCategory(id: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandCategoryRepository.delete(id, centerId);
  revalidatePath("/panel/on-demand/categorias");
  redirect("/panel/on-demand/categorias");
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandCategoryRepository.reorder(centerId, orderedIds);
  revalidatePath("/panel/on-demand/categorias");
}
