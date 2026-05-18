"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { centerHolidayRepository, liveClassRepository } from "@/lib/adapters/db";
import { parseHolidayDateInput, holidayCalendarKey } from "@/lib/domain/holiday-date";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import { civilDayKeyInTz } from "@/lib/datetime/civil-day";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const date = parseHolidayDateInput(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Fecha inválida." };
  }

  const existing = await centerHolidayRepository.findByCenterIdAndDate(centerId, date);
  if (existing) {
    return { ok: false, error: "Ya existe un feriado para esa fecha." };
  }

  // Buscamos en una ventana holgada (±1 día UTC) y filtramos por día civil
  // en la TZ del centro. Esto evita perder clases nocturnas cuya hora UTC
  // cae fuera del día UTC del feriado (ej.: 20:15 Chile = 00:15 UTC del
  // día siguiente — antes se escapaban sin cancelar).
  const tz = await getCenterTimezone(centerId);
  const widenedStart = new Date(date.getTime() - DAY_MS);
  const widenedEnd = new Date(date.getTime() + 2 * DAY_MS);
  const candidates = await liveClassRepository.findByCenterIdAndRange(
    centerId,
    widenedStart,
    widenedEnd,
  );
  const holidayKey = holidayCalendarKey(date);
  const classesOnDay = candidates.filter(
    (c) => civilDayKeyInTz(c.startsAt, tz) === holidayKey,
  );

  let classesWithReservations = 0;
  for (const cls of classesOnDay) {
    const count = await liveClassRepository.countConfirmedReservations(cls.id);
    if (count > 0) classesWithReservations++;
  }

  if (classesWithReservations > 0) {
    return {
      ok: false,
      error: `No se puede agregar el feriado: hay ${classesWithReservations} clase${classesWithReservations !== 1 ? "s" : ""} con reservas confirmadas ese día. Debes mover o cancelar esas clases primero.`,
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
