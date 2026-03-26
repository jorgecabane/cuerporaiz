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
  await requireAdminCenterId();
  await onDemandPracticeRepository.create({ categoryId, ...data });
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
  await requireAdminCenterId();
  await onDemandPracticeRepository.update(id, data);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
}

export async function deletePractice(id: string, categoryId: string): Promise<void> {
  await requireAdminCenterId();
  await onDemandPracticeRepository.delete(id);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
  redirect(`/panel/on-demand/categorias/${categoryId}`);
}

export async function reorderPractices(
  orderedIds: string[],
  categoryId: string
): Promise<void> {
  await requireAdminCenterId();
  await onDemandPracticeRepository.reorder(orderedIds);
  revalidatePath(`/panel/on-demand/categorias/${categoryId}`);
}
