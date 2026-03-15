"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { instructorRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

export async function createInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  if (!name || !email) return;
  await instructorRepository.create(centerId, { name, email });
  redirect("/panel/profesoras");
}

export async function updateInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) return;
  await instructorRepository.update(id, centerId, { name });
  redirect("/panel/profesoras");
}

export async function deactivateInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  if (!id) return;
  await instructorRepository.deactivate(id, centerId);
  redirect("/panel/profesoras");
}
