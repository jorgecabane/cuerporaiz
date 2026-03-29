"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { instructorRepository, centerRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildWelcomeStaffEmail } from "@/lib/email/transactional";

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
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || undefined;
  if (!name || !email) return;
  await instructorRepository.create(centerId, { name, email, imageUrl: imageUrl || null });

  const center = await centerRepository.findById(centerId);
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  sendEmailSafe(
    buildWelcomeStaffEmail({
      toEmail: email,
      name,
      role: "INSTRUCTOR",
      centerName: center?.name ?? "tu centro",
      loginUrl: `${baseUrl}/auth/register`,
    })
  );

  redirect("/panel/profesoras");
}

export async function updateInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || "";
  if (!id || !name) return;
  await instructorRepository.update(id, centerId, { name, imageUrl: imageUrl || null });
  redirect("/panel/profesoras");
}

export async function deactivateInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  if (!id) return;
  await instructorRepository.deactivate(id, centerId);
  redirect("/panel/profesoras");
}
