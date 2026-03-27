"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import {
  onDemandCategoryRepository,
} from "@/lib/adapters/db";
import type { OnDemandContentStatus } from "@/lib/domain/on-demand";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  return session.user.centerId;
}

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
  await requireAdminCenterId();
  await onDemandCategoryRepository.update(id, data);
  revalidatePath("/panel/on-demand/categorias");
  revalidatePath(`/panel/on-demand/categorias/${id}`);
}

export async function deleteCategory(id: string): Promise<void> {
  await requireAdminCenterId();
  await onDemandCategoryRepository.delete(id);
  revalidatePath("/panel/on-demand/categorias");
  redirect("/panel/on-demand/categorias");
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await requireAdminCenterId();
  await onDemandCategoryRepository.reorder(orderedIds);
  revalidatePath("/panel/on-demand/categorias");
}
