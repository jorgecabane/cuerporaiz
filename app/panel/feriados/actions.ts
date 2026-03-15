"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerHolidayRepository, liveClassRepository } from "@/lib/adapters/db";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

export interface CreateHolidayResult {
  ok: boolean;
  error?: string;
  blockedClassCount?: number;
}

export async function createHoliday(
  dateStr: string,
  label: string,
): Promise<CreateHolidayResult> {
  const centerId = await requireAdminCenterId();
  const date = new Date(dateStr + "T00:00:00Z");

  const existing = await centerHolidayRepository.findByCenterIdAndDate(centerId, date);
  if (existing) {
    return { ok: false, error: "Ya existe un feriado para esa fecha." };
  }

  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const classesOnDay = await liveClassRepository.findByCenterIdAndRange(centerId, dayStart, dayEnd);

  let classesWithReservations = 0;
  for (const cls of classesOnDay) {
    const count = await liveClassRepository.countConfirmedReservations(cls.id);
    if (count > 0) classesWithReservations++;
  }

  if (classesWithReservations > 0) {
    return {
      ok: false,
      error: `No se puede agregar el feriado: hay ${classesWithReservations} clase${classesWithReservations !== 1 ? "s" : ""} con reservas confirmadas ese día. Debés mover o cancelar esas clases primero.`,
      blockedClassCount: classesWithReservations,
    };
  }

  if (classesOnDay.length > 0) {
    for (const cls of classesOnDay) {
      await liveClassRepository.update(cls.id, centerId, { status: "CANCELLED" });
    }
  }

  await centerHolidayRepository.create(centerId, { date, label: label || null });

  return { ok: true };
}

export async function deleteHoliday(id: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await centerHolidayRepository.delete(id, centerId);
  redirect("/panel/feriados");
}
