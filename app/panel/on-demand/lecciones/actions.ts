"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandLessonRepository,
  onDemandPracticeRepository,
  lessonUnlockRepository,
} from "@/lib/adapters/db";
import { revalidatePath } from "next/cache";
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/domain/on-demand";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  return session.user.centerId;
}

export async function createLesson(data: CreateLessonInput): Promise<void> {
  const centerId = await requireAdminCenterId();
  const lesson = await onDemandLessonRepository.create(centerId, data);
  const practice = await onDemandPracticeRepository.findById(data.practiceId);
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  redirect("/panel/on-demand/categorias");
}

export async function updateLesson(id: string, data: UpdateLessonInput): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandLessonRepository.update(id, centerId, data);
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  const lesson = await onDemandLessonRepository.findById(id);
  if (lesson) {
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  }
  redirect("/panel/on-demand/categorias");
}

/**
 * Borra una lección si nadie la canjeó. Si hay LessonUnlock asociadas, devuelve
 * `{ ok: false }` con el conteo para que la UI ofrezca archivar en su lugar.
 * Cuando sí borra, hace redirect (no retorna).
 */
export async function deleteLesson(
  id: string
): Promise<{ ok: false; reason: "has_unlocks"; unlockCount: number }> {
  const centerId = await requireAdminCenterId();
  const unlockCount = await lessonUnlockRepository.countByLessonId(id);
  if (unlockCount > 0) {
    return { ok: false, reason: "has_unlocks", unlockCount };
  }
  const lesson = await onDemandLessonRepository.findById(id);
  await onDemandLessonRepository.delete(id, centerId);
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  if (lesson) {
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  }
  redirect("/panel/on-demand/categorias");
}

/**
 * Archiva una lección: pasa status a ARCHIVED. Deja de aparecer en el catálogo
 * público pero quien tiene LessonUnlock conserva acceso (el acceso depende del
 * unlock, no del status).
 */
export async function archiveLesson(id: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandLessonRepository.update(id, centerId, { status: "ARCHIVED" });
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  const lesson = await onDemandLessonRepository.findById(id);
  if (lesson) {
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  }
  redirect("/panel/on-demand/categorias");
}

/**
 * Des-archiva una lección: vuelve a status PUBLISHED y reaparece en el catálogo.
 */
export async function unarchiveLesson(id: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await onDemandLessonRepository.update(id, centerId, { status: "PUBLISHED" });
  revalidatePath("/panel/on-demand");
  revalidatePath("/catalogo");
  const lesson = await onDemandLessonRepository.findById(id);
  if (lesson) {
    const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
    if (practice) redirect(`/panel/on-demand/categorias/${practice.categoryId}/practicas/${practice.id}`);
  }
  redirect("/panel/on-demand/categorias");
}
