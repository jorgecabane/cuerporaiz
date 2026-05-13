"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/domain/role";
import { userRepository, authTokenRepository, centerRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildWelcomeStudentByAdminEmail } from "@/lib/email";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { requestInvitationToken } from "@/lib/application/request-password-reset";

export async function createClient(data: {
  email: string;
  name: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  const centerId = session.user.centerId as string;

  const existing = await userRepository.findByEmail(data.email);
  if (existing) {
    const memberships = await prisma.userCenterRole.findMany({
      where: { userId: existing.id, centerId },
    });
    if (memberships.length > 0) {
      return { error: "Este email ya está registrado en tu centro" };
    }
    // Usuario existente en otro centro: solo agregamos el rol.
    await userRepository.addRole(existing.id, centerId, "STUDENT");
    revalidatePath("/panel/clientes");
    return {};
  }

  // Usuario nuevo: creamos cuenta con contraseña random + le mandamos invitación
  // para que defina la suya con un token de password-reset de 7 días.
  const tempPassword = randomUUID().slice(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await userRepository.create({
    email: data.email,
    passwordHash,
    name: data.name || null,
  });
  await userRepository.addRole(user.id, centerId, "STUDENT");

  const token = await requestInvitationToken(user.id, authTokenRepository);
  const branding = await getEmailBranding(centerId);
  const center = await centerRepository.findById(centerId);
  const setPasswordUrl = `${getBaseUrl()}/auth/reset-password?token=${token}&invite=1`;

  sendEmailSafe(
    buildWelcomeStudentByAdminEmail({
      toEmail: data.email,
      userName: data.name || data.email.split("@")[0],
      setPasswordUrl,
      customBodyFragment: center?.welcomeEmailCustomBody?.trim() || undefined,
      branding,
    })
  );

  revalidatePath("/panel/clientes");
  return {};
}

export async function updateClient(data: {
  userId: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  rut: string;
  birthday: string;
  sex: string;
  notes: string;
  isLegacyClient: boolean;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  const centerId = session.user.centerId as string;

  const membership = await prisma.userCenterRole.findFirst({
    where: { userId: data.userId, centerId },
  });
  if (!membership) {
    return { error: "Cliente no encontrado en este centro" };
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      name: data.name || null,
      lastName: data.lastName || null,
      email: data.email,
      phone: data.phone || null,
      rut: data.rut || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      sex: data.sex || null,
      notes: data.notes || null,
    },
  });
  if (membership.isLegacyClient !== data.isLegacyClient) {
    await prisma.userCenterRole.update({
      where: { userId_centerId: { userId: data.userId, centerId } },
      data: { isLegacyClient: data.isLegacyClient },
    });
  }
  revalidatePath("/panel/clientes");
  revalidatePath(`/panel/clientes/${data.userId}`);
  return {};
}
