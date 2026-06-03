import type { LiveClassSeries } from "@/lib/domain";
import type { CreateLiveClassInput } from "@/lib/ports";
import {
  civilDateTimeInTzToUtc,
  civilDayKeyInTz,
  civilDayOfMonthInTz,
  civilDayOfWeekInTz,
  civilHourMinuteInTz,
  civilYearMonthDayInTz,
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

  // baseHour/baseMinute UTC se conservan sólo para derivar la fecha civil
  // aproximada de cada candidato. La hora real de cada instancia se
  // reconstruye desde civilStart + civil date + TZ para que DST no
  // desfase la hora civil entre instancias.
  const baseHour = series.startsAt.getUTCHours();
  const baseMinute = series.startsAt.getUTCMinutes();
  const civilStart = civilHourMinuteInTz(series.startsAt, timeZone);

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
    let civilDate = civilYearMonthDayInTz(cursor, timeZone);
    const MAX_ITERS = MAX_INSTANCES;
    for (let iter = 0; instances.length < maxCount && iter < MAX_ITERS; iter++) {
      const candidate =
        iter === 0
          ? new Date(cursor)
          : civilDateTimeInTzToUtc(
              civilDate.year,
              civilDate.month,
              civilDate.day,
              civilStart.hour,
              civilStart.minute,
              timeZone,
            );
      if (candidate > horizon) break;
      if (!holidays.has(dateKey(candidate))) {
        instances.push(makeInput(candidate));
      }
      civilDate = addCivilDays(civilDate, series.repeatEveryN);
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
        // Punto "crudo" para derivar la fecha civil del candidato.
        const rough = new Date(weekCursor);
        rough.setUTCDate(rough.getUTCDate() + dow);
        rough.setUTCHours(baseHour, baseMinute, 0, 0);

        if (!daysOfWeek.has(civilDayOfWeekInTz(rough, timeZone))) continue;

        // Reconstruir UTC desde fecha civil + hora civil de inicio. Esto
        // mantiene la hora civil estable aunque el offset cambie (DST).
        const civilDate = civilYearMonthDayInTz(rough, timeZone);
        const candidate = civilDateTimeInTzToUtc(
          civilDate.year,
          civilDate.month,
          civilDate.day,
          civilStart.hour,
          civilStart.minute,
          timeZone,
        );

        if (candidate <= series.startsAt) continue;
        if (candidate > horizon) break;
        if (holidays.has(dateKey(candidate))) continue;

        instances.push(makeInput(candidate));
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
          civilHour: civilStart.hour,
          civilMinute: civilStart.minute,
          timeZone,
        });
        if (!candidate) continue; // mes sin Nth occurrence — saltar
        if (candidate > horizon) break;
        if (holidays.has(dateKey(candidate))) continue;
        instances.push(makeInput(candidate));
      }
    } else {
      // dayOfMonth: día civil del mes (no UTC). Reconstruimos UTC con
      // civilStart para que DST no shifte la hora.
      const targetDayOfMonth = civilDayOfMonthInTz(cursor, timeZone);
      const startYm = civilYearMonthInTz(cursor, timeZone);
      const MAX_ITERS = 12 * 30;
      for (let iter = 0; instances.length < maxCount && iter < MAX_ITERS; iter++) {
        const totalMonths =
          startYm.year * 12 + (startYm.month - 1) + iter * series.repeatEveryN;
        const targetY = Math.floor(totalMonths / 12);
        const targetM = (totalMonths % 12) + 1;
        const daysInMonth = new Date(targetY, targetM, 0).getDate();
        const targetD = Math.min(targetDayOfMonth, daysInMonth);
        const candidate = civilDateTimeInTzToUtc(
          targetY,
          targetM,
          targetD,
          civilStart.hour,
          civilStart.minute,
          timeZone,
        );
        if (candidate > horizon) break;
        if (!holidays.has(dateKey(candidate))) {
          instances.push(makeInput(candidate));
        }
      }
    }
  }

  return instances;
}

/**
 * Encuentra el Nth día civil "targetDow" del mes civil (targetY, targetM) y
 * devuelve el instante UTC correspondiente a civilHour:civilMinute hora civil
 * (i.e. el offset se resuelve al instante real, respetando DST).
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
  civilHour: number;
  civilMinute: number;
  timeZone: string;
}): Date | null {
  const {
    year,
    month,
    targetDow,
    weekNum,
    baseHour,
    baseMinute,
    civilHour,
    civilMinute,
    timeZone,
  } = opts;

  // Punto crudo para localizar el Nth día. baseHour/baseMinute UTC se usan
  // sólo para que la fecha civil sea estable durante la búsqueda; la hora
  // real se reconstruye al final con civilHour/civilMinute.
  const rough = new Date(Date.UTC(year, month - 1, 1, baseHour, baseMinute));
  for (let safety = 0; safety < 5; safety++) {
    const ym = civilYearMonthInTz(rough, timeZone);
    if (ym.year === year && ym.month === month) break;
    rough.setUTCDate(rough.getUTCDate() + 1);
  }
  for (let safety = 0; safety < 7; safety++) {
    if (civilDayOfWeekInTz(rough, timeZone) === targetDow) break;
    rough.setUTCDate(rough.getUTCDate() + 1);
  }
  rough.setUTCDate(rough.getUTCDate() + (weekNum - 1) * 7);

  const finalYmd = civilYearMonthDayInTz(rough, timeZone);
  if (finalYmd.year !== year || finalYmd.month !== month) return null;
  return civilDateTimeInTzToUtc(
    finalYmd.year,
    finalYmd.month,
    finalYmd.day,
    civilHour,
    civilMinute,
    timeZone,
  );
}

/** Suma N días civiles a una fecha civil {year, month, day}. */
function addCivilDays(
  d: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}
