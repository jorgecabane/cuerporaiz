"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { onDemandLessonRepository, onDemandPracticeRepository } from "@/lib/adapters/db";
import { revalidatePath } from "next/cache";
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/domain/on-demand";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  return session.user.centerId;
}

export async function createLesson(data: CreateLessonInput): Promise<void> {
  await requireAdminCenterId();
  const lesson = await onDemandLessonRepository.create(data);
  const practice = await onDemandPracticeRepository.findById(data.practiceId);
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  redirect("/panel/on-demand/categorias");
}

export async function updateLesson(id: string, data: UpdateLessonInput): Promise<void> {
  await requireAdminCenterId();
  await onDemandLessonRepository.update(id, data);
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
}

export async function deleteLesson(id: string): Promise<void> {
  await requireAdminCenterId();
  const lesson = await onDemandLessonRepository.findById(id);
  await onDemandLessonRepository.delete(id);
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  if (lesson) {
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  }
  redirect("/panel/on-demand/categorias");
}
