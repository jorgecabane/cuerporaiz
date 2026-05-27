"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import {
  onDemandPracticeRepository,
} from "@/lib/adapters/db";
import type { OnDemandContentStatus } from "@/lib/domain/on-demand";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  return session.user.centerId;
}

export async function createPractice(
  categoryId: string,
  data: {
    name: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    status?: OnDemandContentStatus;
  }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandPracticeRepository.create(centerId, { categoryId, ...data });
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
}

export async function updatePractice(
  id: string,
  categoryId: string,
  data: {
    name?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    status?: OnDemandContentStatus;
  }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandPracticeRepository.update(id, centerId, data);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}/practicas/${id}`);
  redirect(`/panel/on-demand/categorias/${categoryId}/practicas/${id}`);
}

export async function deletePractice(id: string, categoryId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandPracticeRepository.delete(id, centerId);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
  redirect(`/panel/on-demand/categorias/${categoryId}`);
}

export async function reorderPractices(
  orderedIds: string[],
  categoryId: string
): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandPracticeRepository.reorder(centerId, orderedIds);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
}
