"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository } from "@/lib/adapters/db";
import type { CenterPoliciesUpdate } from "@/lib/ports";
import {
  MAX_BOOK_BEFORE_MINUTES,
  MAX_CANCEL_BEFORE_MINUTES,
} from "@/lib/domain/center-policy";

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
    (data.cancelBeforeMinutes !== undefined &&
      (data.cancelBeforeMinutes < 0 || data.cancelBeforeMinutes > MAX_CANCEL_BEFORE_MINUTES)) ||
    (data.maxNoShowsPerMonth !== undefined && (data.maxNoShowsPerMonth < 0 || data.maxNoShowsPerMonth > 31)) ||
    (data.bookBeforeMinutes !== undefined &&
      (data.bookBeforeMinutes < 0 || data.bookBeforeMinutes > MAX_BOOK_BEFORE_MINUTES))
  ) {
    return { error: "Valores fuera de rango" };
  }
  await centerRepository.updatePolicies(centerId, data);
  revalidatePath("/panel/politicas");
  return {};
}
