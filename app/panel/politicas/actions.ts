"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository } from "@/lib/adapters/db";
import type { CenterPoliciesUpdate } from "@/lib/ports";

export async function updateCenterPolicies(
  centerId: string,
  data: CenterPoliciesUpdate
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/auth/login");
  }
  if (session.user.centerId !== centerId) {
    redirect("/panel");
  }
  if (
    (data.cancelBeforeHours !== undefined && (data.cancelBeforeHours < 0 || data.cancelBeforeHours > 168)) ||
    (data.maxNoShowsPerMonth !== undefined && (data.maxNoShowsPerMonth < 0 || data.maxNoShowsPerMonth > 31)) ||
    (data.bookBeforeHours !== undefined && (data.bookBeforeHours < 0 || data.bookBeforeHours > 720))
  ) {
    return { error: "Valores fuera de rango" };
  }
  await centerRepository.updatePolicies(centerId, data);
  revalidatePath("/panel/politicas");
  return {};
}
