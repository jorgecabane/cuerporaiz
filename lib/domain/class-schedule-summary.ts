import { civilHourMinuteInTz } from "@/lib/datetime/civil-day";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function weekdayInTz(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/**
 * Resumen legible del horario de cada práctica a partir de sus clases reales
 * (ej. próximos 7 días): "Lunes y miércoles 08:00 · Jueves 20:00".
 */
export function summarizeScheduleByDiscipline(
  classes: { disciplineId: string | null; startsAt: Date }[],
  timeZone: string
): Map<string, string> {
  const byDiscipline = new Map<string, Map<string, Set<number>>>();
  for (const c of classes) {
    if (!c.disciplineId) continue;
    const { hour, minute } = civilHourMinuteInTz(c.startsAt, timeZone);
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const byTime = byDiscipline.get(c.disciplineId) ?? new Map<string, Set<number>>();
    byTime.set(time, (byTime.get(time) ?? new Set()).add(weekdayInTz(c.startsAt, timeZone)));
    byDiscipline.set(c.disciplineId, byTime);
  }

  const result = new Map<string, string>();
  for (const [disciplineId, byTime] of byDiscipline) {
    const parts = [...byTime.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, days]) => {
        const names = WEEKDAY_ORDER.filter((d) => days.has(d)).map((d) => WEEKDAY_NAMES[d]);
        const text = joinSpanish(names);
        return `${text.charAt(0).toUpperCase()}${text.slice(1)} ${time}`;
      });
    result.set(disciplineId, parts.join(" · "));
  }
  return result;
}
