import type { LiveClassSeries } from "@/lib/domain";
import type { CreateLiveClassInput } from "@/lib/ports";
import {
  civilDayKeyInTz,
  civilDayOfMonthInTz,
  civilDayOfWeekInTz,
  civilYearMonthInTz,
} from "@/lib/datetime/civil-day";

const MAX_INSTANCES = 365;
const DEFAULT_HORIZON_DAYS = 180;

/**
 * Given a series definition, generate the list of LiveClass inputs
 * (dates/times) that should be created.
 * Does NOT persist; the caller is responsible for createMany.
 *
 * `timeZone` se usa para comparar el día civil de cada instancia contra
 * el set de feriados (que están en clave YYYY-MM-DD del día civil en TZ
 * del centro). Default "UTC" preserva compatibilidad con tests existentes;
 * los callers en producción deben pasar la TZ del centro.
 */
export function generateSeriesInstances(
  series: LiveClassSeries,
  holidayDates?: Set<string>,
  timeZone: string = "UTC",
): CreateLiveClassInput[] {
  const instances: CreateLiveClassInput[] = [];
  const holidays = holidayDates ?? new Set<string>();

  const baseHour = series.startsAt.getUTCHours();
  const baseMinute = series.startsAt.getUTCMinutes();

  const horizon = series.endsAt
    ? series.endsAt
    : new Date(series.startsAt.getTime() + DEFAULT_HORIZON_DAYS * 86400000);

  const maxCount = series.repeatCount ?? MAX_INSTANCES;

  const cursor = new Date(series.startsAt);

  function dateKey(d: Date): string {
    return civilDayKeyInTz(d, timeZone);
  }

  function makeInput(date: Date): CreateLiveClassInput {
    return {
      title: series.title,
      startsAt: date,
      durationMinutes: series.durationMinutes,
      maxCapacity: series.maxCapacity,
      disciplineId: series.disciplineId,
      instructorId: series.instructorId,
      isOnline: series.isOnline,
      meetingUrl: series.meetingUrl,
      acceptsTrialReservations: series.acceptsTrialReservations,
      trialCapacity: series.trialCapacity,
      color: series.color,
      seriesId: series.id,
    };
  }

  if (series.repeatFrequency === "DAILY") {
    while (cursor <= horizon && instances.length < maxCount) {
      if (!holidays.has(dateKey(cursor))) {
        instances.push(makeInput(new Date(cursor)));
      }
      cursor.setUTCDate(cursor.getUTCDate() + series.repeatEveryN);
    }
  } else if (series.repeatFrequency === "WEEKLY") {
    // El set viene en día CIVIL (lo que eligió el usuario en su calendario).
    // Si está vacío, defaulteamos al civil DOW del startsAt — usar
    // cursor.getUTCDay() acá produce shift cuando la hora cae cerca de
    // medianoche local (ej. 20:00 Chile = 00:00 UTC del día siguiente).
    const daysOfWeek =
      series.repeatOnDaysOfWeek.length > 0
        ? new Set(series.repeatOnDaysOfWeek)
        : new Set([civilDayOfWeekInTz(cursor, timeZone)]);

    // Always include startsAt as the first instance, even if its day-of-week
    // isn't in the recurrence pattern (e.g. class created on Sunday but repeats Mon-Fri)
    if (!holidays.has(dateKey(cursor))) {
      instances.push(makeInput(new Date(cursor)));
    }

    const weekStart = new Date(cursor);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

    const weekCursor = new Date(weekStart);

    while (weekCursor <= horizon && instances.length < maxCount) {
      for (let dow = 0; dow < 7 && instances.length < maxCount; dow++) {
        const candidate = new Date(weekCursor);
        candidate.setUTCDate(candidate.getUTCDate() + dow);
        candidate.setUTCHours(baseHour, baseMinute, 0, 0);

        // Comparar contra el día civil del candidato (en TZ del centro),
        // no contra el iterador dow (que está en UTC).
        if (!daysOfWeek.has(civilDayOfWeekInTz(candidate, timeZone))) continue;

        if (candidate <= series.startsAt) continue;
        if (candidate > horizon) break;
        if (holidays.has(dateKey(candidate))) continue;

        instances.push(makeInput(new Date(candidate)));
      }
      weekCursor.setUTCDate(weekCursor.getUTCDate() + 7 * series.repeatEveryN);
    }
  } else if (series.repeatFrequency === "MONTHLY") {
    if (series.monthlyMode === "weekdayOrdinal") {
      // Mismo razonamiento que WEEKLY: el target debe ser día civil (en TZ
      // del centro), no UTC. La "semana ordinal" también se mide en mes
      // civil. Para cada iteración, busco el Nth civil targetDow en el mes
      // civil correspondiente y construyo el UTC del candidato.
      const targetDow = civilDayOfWeekInTz(cursor, timeZone);
      const targetWeekNum = Math.ceil(civilDayOfMonthInTz(cursor, timeZone) / 7);
      const startYm = civilYearMonthInTz(cursor, timeZone);

      const MAX_ITERS = 12 * 30; // safety: 30 años
      for (let iter = 0; instances.length < maxCount && iter < MAX_ITERS; iter++) {
        const totalMonths =
          startYm.year * 12 + (startYm.month - 1) + iter * series.repeatEveryN;
        const targetY = Math.floor(totalMonths / 12);
        const targetM = (totalMonths % 12) + 1;

        const candidate = findNthCivilDowInMonth({
          year: targetY,
          month: targetM,
          targetDow,
          weekNum: targetWeekNum,
          baseHour,
          baseMinute,
          timeZone,
        });
        if (!candidate) continue; // mes sin Nth occurrence — saltar
        if (candidate > horizon) break;
        if (holidays.has(dateKey(candidate))) continue;
        instances.push(makeInput(candidate));
      }
    } else {
      const dayOfMonth = cursor.getUTCDate();
      while (cursor <= horizon && instances.length < maxCount) {
        if (!holidays.has(dateKey(cursor))) {
          instances.push(makeInput(new Date(cursor)));
        }
        cursor.setUTCMonth(cursor.getUTCMonth() + series.repeatEveryN);
        cursor.setUTCDate(Math.min(dayOfMonth, new Date(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0).getUTCDate()));
        cursor.setUTCHours(baseHour, baseMinute, 0, 0);
      }
    }
  }

  return instances;
}

/**
 * Encuentra el Nth día civil "targetDow" del mes civil (targetY, targetM) y
 * devuelve el instante UTC correspondiente a baseHour:baseMinute UTC.
 *
 * Devuelve null si el mes no tiene un "Nth targetDow" (ej. 5to Miércoles
 * en un mes que tiene sólo 4).
 */
function findNthCivilDowInMonth(opts: {
  year: number;
  month: number;
  targetDow: number;
  weekNum: number;
  baseHour: number;
  baseMinute: number;
  timeZone: string;
}): Date | null {
  const { year, month, targetDow, weekNum, baseHour, baseMinute, timeZone } = opts;

  // Punto de partida: UTC (year, month, 1) a baseHour. Dependiendo del offset
  // este instante puede caer en el mes civil anterior; avanzamos UTC days
  // hasta que el día civil esté en (year, month).
  const candidate = new Date(Date.UTC(year, month - 1, 1, baseHour, baseMinute));
  for (let safety = 0; safety < 5; safety++) {
    const ym = civilYearMonthInTz(candidate, timeZone);
    if (ym.year === year && ym.month === month) break;
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  // Avanzar hasta el primer civil targetDow del mes.
  for (let safety = 0; safety < 7; safety++) {
    if (civilDayOfWeekInTz(candidate, timeZone) === targetDow) break;
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  // Sumar (weekNum - 1) semanas para llegar al Nth.
  candidate.setUTCDate(candidate.getUTCDate() + (weekNum - 1) * 7);

  // Verificar que sigue en el mes civil objetivo.
  const finalYm = civilYearMonthInTz(candidate, timeZone);
  if (finalYm.year !== year || finalYm.month !== month) return null;
  return candidate;
}
