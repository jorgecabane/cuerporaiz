"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/domain/role";
import { mercadopagoConfigRepository, zoomConfigRepository, googleMeetConfigRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";

export async function toggleMercadoPago(centerId: string, enabled: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  if (session.user.centerId !== centerId) {
    redirect("/panel");
  }
  const status = await mercadopagoConfigRepository.findStatusByCenterId(centerId);
  if (!status) {
    redirect("/panel/plugins?error=no-config");
  }
  await mercadopagoConfigRepository.updateEnabled(centerId, enabled);
  revalidatePath("/panel/plugins");
}

export async function toggleZoom(centerId: string, enabled: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  if (session.user.centerId !== centerId) {
    redirect("/panel");
  }
  const status = await zoomConfigRepository.findStatusByCenterId(centerId);
  if (!status) {
    redirect("/panel/plugins/zoom?error=no-config");
  }
  await zoomConfigRepository.updateEnabled(centerId, enabled);
  revalidatePath("/panel/plugins");
  revalidatePath("/panel/plugins/zoom");
}

export async function toggleGoogleMeet(centerId: string, enabled: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  if (session.user.centerId !== centerId) {
    redirect("/panel");
  }
  const status = await googleMeetConfigRepository.findStatusByCenterId(centerId);
  if (!status) {
    redirect("/panel/plugins/meet?error=no-config");
  }
  await googleMeetConfigRepository.updateEnabled(centerId, enabled);
  revalidatePath("/panel/plugins");
  revalidatePath("/panel/plugins/meet");
}

export async function toggleBankTransfer(centerId: string, enabled: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  if (session.user.centerId !== centerId) {
    redirect("/panel");
  }
  await prisma.center.update({
    where: { id: centerId },
    data: { bankTransferEnabled: enabled },
  });
  revalidatePath("/panel/plugins");
}

export interface BankDataInput {
  centerId: string;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
}

export async function saveBankData(data: BankDataInput): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  if (session.user.centerId !== data.centerId) {
    redirect("/panel");
  }
  await prisma.center.update({
    where: { id: data.centerId },
    data: {
      bankName: data.bankName,
      bankAccountType: data.bankAccountType,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountHolder: data.bankAccountHolder,
      bankAccountRut: data.bankAccountRut,
      bankAccountEmail: data.bankAccountEmail,
    },
  });
  revalidatePath("/panel/plugins");
  return {};
}
