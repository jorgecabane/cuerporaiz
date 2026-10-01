"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { disciplineRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";

const DESCRIPTION_MAX = 200;
const LONG_DESCRIPTION_MAX = 800;

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

function readText(formData: FormData, key: string, max: number): string | null {
  return (formData.get(key) as string)?.trim().slice(0, max) || null;
}

export async function createDiscipline(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const color = (formData.get("color") as string)?.trim() || null;
  const description = readText(formData, "description", DESCRIPTION_MAX);
  const longDescription = readText(formData, "longDescription", LONG_DESCRIPTION_MAX);
  await disciplineRepository.create(centerId, { name, description, longDescription, color });
  redirect("/panel/disciplinas");
}

export async function updateDiscipline(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) return;
  const color = (formData.get("color") as string)?.trim() || null;
  const active = formData.getAll("active").includes("true");
  const description = readText(formData, "description", DESCRIPTION_MAX);
  const longDescription = readText(formData, "longDescription", LONG_DESCRIPTION_MAX);
  await disciplineRepository.update(id, centerId, { name, description, longDescription, color, active });
  redirect("/panel/disciplinas");
}

export async function deleteDiscipline(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  if (!id) return;
  await disciplineRepository.delete(id, centerId);
  redirect("/panel/disciplinas");
}
