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
    (data.bookBeforeHours !== undefined && (data.bookBeforeHours < 0 || data.bookBeforeHours > 720)) ||
    (data.calendarStartHour !== undefined && (data.calendarStartHour < 0 || data.calendarStartHour > 12)) ||
    (data.calendarEndHour !== undefined && (data.calendarEndHour < 12 || data.calendarEndHour > 24)) ||
    (data.defaultClassDurationMinutes !== undefined && (data.defaultClassDurationMinutes < 15 || data.defaultClassDurationMinutes > 240))
  ) {
    return { error: "Valores fuera de rango" };
  }
  if (
    data.calendarStartHour !== undefined &&
    data.calendarEndHour !== undefined &&
    data.calendarStartHour >= data.calendarEndHour
  ) {
    return { error: "La hora de inicio debe ser menor que la hora de fin" };
  }
  await centerRepository.updatePolicies(centerId, data);
  revalidatePath("/panel/politicas");
  return {};
}
