"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/domain/role";
import { mercadopagoConfigRepository } from "@/lib/adapters/db";

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
