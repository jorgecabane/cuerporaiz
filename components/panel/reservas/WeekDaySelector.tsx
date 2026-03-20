"use client";

import { localYmdFromDate, localYmdFromIso } from "@/lib/datetime/local-ymd";
import { getWeekBounds } from "./WeekNav";

export interface WeekDaySelectorProps {
  weekAnchor: Date;
  weekStartDay?: number;
  selectedDate: string | null;
  onSelectDay: (dateKey: string) => void;
  classCountByDay?: Record<string, number>;
  className?: string;
}

function toDateKey(d: Date): string {
  return localYmdFromDate(d);
}

export function WeekDaySelector({
  weekAnchor,
  weekStartDay = 1,
  selectedDate,
  onSelectDay,
  classCountByDay = {},
  className = "",
}: WeekDaySelectorProps) {
  const { start } = getWeekBounds(weekAnchor, weekStartDay);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const todayKey = toDateKey(new Date());

  return (
    <div
      className={`flex flex-nowrap gap-2 overflow-x-auto pb-1 ${className}`}
      role="tablist"
      aria-label="Días de la semana"
    >
      {days.map((d) => {
        const dateKey = toDateKey(d);
        const isSelected = selectedDate === dateKey;
        const isToday = dateKey === todayKey;
        const isPast = dateKey < todayKey;
        const count = classCountByDay[dateKey] ?? 0;
        const weekday = d.toLocaleDateString("es-CL", { weekday: "short" }).replace(/^\./, "");
        const dayNum = d.getDate();
        const month = d.toLocaleDateString("es-CL", { month: "short" });
        return (
          <button
            key={dateKey}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectDay(dateKey)}
            className={`min-w-0 shrink-0 rounded-[var(--radius-md)] border px-3 py-2 text-center text-sm font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isSelected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                : isToday
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-text)]"
                  : isPast
                    ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] opacity-80 hover:bg-[var(--color-border)]/20"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]/30"
            }`}
          >
            <span className="block uppercase">{weekday}</span>
            <span className="block tabular-nums">{dayNum}</span>
            <span className="block text-[10px] opacity-80">{month}</span>
            {count > 0 && (
              <span className="mt-0.5 block text-[10px] opacity-90">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function groupClassesByDay<T extends { startsAt: string }>(classes: T[]): Map<string, T[]> {
  const byDay = new Map<string, T[]>();
  for (const c of classes) {
    const key = localYmdFromIso(c.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return byDay;
}
