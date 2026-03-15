import type { LiveClassSeries } from "@/lib/domain";
import type { CreateLiveClassInput } from "@/lib/ports";

const MAX_INSTANCES = 365;
const DEFAULT_HORIZON_DAYS = 180;

/**
 * Given a series definition, generate the list of LiveClass inputs
 * (dates/times) that should be created.
 * Does NOT persist; the caller is responsible for createMany.
 */
export function generateSeriesInstances(
  series: LiveClassSeries,
  holidayDates?: Set<string>,
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
    return d.toISOString().slice(0, 10);
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
      isTrialClass: series.isTrialClass,
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
    const daysOfWeek =
      series.repeatOnDaysOfWeek.length > 0
        ? new Set(series.repeatOnDaysOfWeek)
        : new Set([cursor.getUTCDay()]);

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
        if (!daysOfWeek.has(dow)) continue;
        const candidate = new Date(weekCursor);
        candidate.setUTCDate(candidate.getUTCDate() + dow);
        candidate.setUTCHours(baseHour, baseMinute, 0, 0);

        if (candidate <= series.startsAt) continue;
        if (candidate > horizon) break;
        if (holidays.has(dateKey(candidate))) continue;

        instances.push(makeInput(new Date(candidate)));
      }
      weekCursor.setUTCDate(weekCursor.getUTCDate() + 7 * series.repeatEveryN);
    }
  } else if (series.repeatFrequency === "MONTHLY") {
    if (series.monthlyMode === "weekdayOrdinal") {
      const targetDow = cursor.getUTCDay();
      const targetWeekNum = Math.ceil(cursor.getUTCDate() / 7);

      while (cursor <= horizon && instances.length < maxCount) {
        if (!holidays.has(dateKey(cursor))) {
          instances.push(makeInput(new Date(cursor)));
        }
        cursor.setUTCMonth(cursor.getUTCMonth() + series.repeatEveryN);
        cursor.setUTCDate(1);
        // Find the Nth occurrence of the target weekday in the new month
        const firstDow = cursor.getUTCDay();
        let offset = targetDow - firstDow;
        if (offset < 0) offset += 7;
        const candidateDate = 1 + offset + (targetWeekNum - 1) * 7;
        const daysInMonth = new Date(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0).getDate();
        cursor.setUTCDate(Math.min(candidateDate, daysInMonth));
        cursor.setUTCHours(baseHour, baseMinute, 0, 0);
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
