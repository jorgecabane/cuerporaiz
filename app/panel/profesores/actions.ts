"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { instructorBankAccountRepository, instructorRepository, authTokenRepository, prisma } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildWelcomeStaffEmail } from "@/lib/email/transactional";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { requestInvitationToken } from "@/lib/application/request-password-reset";

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

  // Si el User recién fue creado por el repo, generamos token de invitación
  // y mandamos correo con link a set-password. Si ya tenía cuenta, no mandamos
  // (el rol se agregó silenciosamente; el profe sigue usando su contraseña actual).
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, emailVerifiedAt: true } });
  const isFirstTime = user && !user.emailVerifiedAt;

  if (user && isFirstTime) {
    const token = await requestInvitationToken(user.id, authTokenRepository);
    const branding = await getEmailBranding(centerId);
    const setPasswordUrl = `${getBaseUrl()}/auth/reset-password?token=${token}&invite=1`;
    sendEmailSafe(
      buildWelcomeStaffEmail({
        toEmail: email,
        name,
        role: "INSTRUCTOR",
        setPasswordUrl,
        branding,
      })
    );
  }

  redirect("/panel/profesores");
}

export async function updateInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || "";
  if (!id || !name) return;
  await instructorRepository.update(id, centerId, { name, imageUrl: imageUrl || null });
  redirect("/panel/profesores");
}

export async function deactivateInstructor(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  if (!id) return;
  await instructorRepository.deactivate(id, centerId);
  redirect("/panel/profesores");
}

export async function saveInstructorBankData(input: {
  instructorUserId: string;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
}): Promise<void> {
  const centerId = await requireAdminCenterId();
  await instructorBankAccountRepository.upsert({
    centerId,
    userId: input.instructorUserId,
    bankName: input.bankName,
    bankAccountType: input.bankAccountType,
    bankAccountNumber: input.bankAccountNumber,
    bankAccountHolder: input.bankAccountHolder,
    bankAccountRut: input.bankAccountRut,
    bankAccountEmail: input.bankAccountEmail,
  });
}
