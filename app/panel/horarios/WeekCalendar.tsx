"use client";

import Link from "next/link";
import type { LiveClass } from "@/lib/domain";
import { layoutBlocks, type LayoutBlock } from "./calendar-layout";

function startOfWeek(d: Date, weekStartDay: number): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function dayLabel(d: Date): string {
  const label = d.toLocaleDateString("es-CL", { weekday: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function groupByDay(
  classes: LiveClass[],
  weekStartDay: number,
): Map<number, LiveClass[]> {
  const map = new Map<number, LiveClass[]>();
  for (const c of classes) {
    const start = new Date(c.startsAt);
    const dayIndex = (start.getDay() - weekStartDay + 7) % 7;
    if (!map.has(dayIndex)) map.set(dayIndex, []);
    map.get(dayIndex)!.push(c);
  }
  return map;
}

interface WeekCalendarProps {
  classes: LiveClass[];
  holidayDates: Set<string>;
  calendarStartHour: number;
  calendarEndHour: number;
  currentDate: Date;
  weekStartDay: number;
  loading: boolean;
  onSlotClick: (dayDate: Date, hour: number) => void;
}

export function WeekCalendar({
  classes,
  holidayDates,
  calendarStartHour,
  calendarEndHour,
  currentDate,
  weekStartDay,
  loading,
  onSlotClick,
}: WeekCalendarProps) {
  const totalHours = calendarEndHour - calendarStartHour;
  const HOURS = Array.from({ length: totalHours }, (_, i) => i + calendarStartHour);

  const weekStart = startOfWeek(currentDate, weekStartDay);
  const now = new Date();

  function isSlotPast(dayDate: Date, hour: number): boolean {
    const slotDate = new Date(dayDate);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < now;
  }

  function isDayPast(dayDate: Date): boolean {
    const endOfDay = new Date(dayDate);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay < now;
  }

  function isDayHoliday(dayDate: Date): boolean {
    return holidayDates.has(formatDateParam(dayDate));
  }

  const classesByDay = groupByDay(classes, weekStartDay);

  const layoutByDay = new Map<number, LayoutBlock[]>();
  for (const [dayIdx, dayClasses] of classesByDay) {
    layoutByDay.set(dayIdx, layoutBlocks(dayClasses, calendarStartHour, totalHours));
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return (
    <div>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-surface)]">
          <div className="p-2" />
          {days.map((d, i) => {
            const dayPast = isDayPast(d);
            const holiday = isDayHoliday(d);
            return (
              <div
                key={i}
                className={`p-2 text-center text-xs font-medium border-l border-[var(--color-border)] ${
                  holiday
                    ? "bg-[var(--color-error)]/10 text-[var(--color-error)]"
                    : isToday(d)
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : dayPast
                        ? "text-[var(--color-text-muted)]/50"
                        : "text-[var(--color-text-muted)]"
                }`}
              >
                <div>{dayLabel(d)}</div>
                <div className="text-lg font-semibold">{d.getDate()}</div>
                {holiday && <div className="text-[0.6rem] leading-tight mt-0.5">Feriado</div>}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] relative" style={{ minHeight: `${HOURS.length * 3.5}rem` }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-right pr-2 text-xs text-[var(--color-text-muted)]"
                style={{ top: `${((h - calendarStartHour) / totalHours) * 100}%` }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((dayDate, dayIdx) => {
            const holiday = isDayHoliday(dayDate);
            const dayBlocks = layoutByDay.get(dayIdx) ?? [];
            return (
              <div key={dayIdx} className="relative border-l border-[var(--color-border)]">
                {HOURS.map((h) => {
                  const past = isSlotPast(dayDate, h);
                  const blocked = past || holiday;
                  return (
                    <div
                      key={h}
                      className={`absolute left-0 right-0 border-t border-[var(--color-border)]/30 ${
                        holiday
                          ? "bg-[var(--color-error)]/5 cursor-default"
                          : blocked
                            ? "bg-[var(--color-border)]/15 cursor-default"
                            : "cursor-pointer hover:bg-[var(--color-primary-light)]/30 transition-colors"
                      }`}
                      style={{ top: `${((h - calendarStartHour) / totalHours) * 100}%`, height: `${(1 / totalHours) * 100}%` }}
                      onClick={blocked ? undefined : () => onSlotClick(dayDate, h)}
                      title={holiday ? "Feriado — no se pueden crear clases" : blocked ? undefined : `Crear clase el ${formatShortDate(dayDate)} a las ${h}:00`}
                    />
                  );
                })}
                {dayBlocks.map((b) => {
                  const widthPercent = 100 / b.totalColumns;
                  const leftPercent = b.column * widthPercent;
                  return (
                    <Link
                      key={b.liveClass.id}
                      href={`/panel/horarios/${b.liveClass.id}`}
                      className="absolute rounded-[var(--radius-sm)] px-1 py-0.5 text-[0.65rem] leading-tight text-white overflow-hidden hover:opacity-90 transition-opacity z-[1] border-r border-[var(--color-surface)]/30"
                      style={{
                        top: `${b.topPercent}%`,
                        height: `${Math.max(b.heightPercent, 1.5)}%`,
                        left: `calc(${leftPercent}% + 1px)`,
                        width: `calc(${widthPercent}% - 2px)`,
                        backgroundColor: b.liveClass.color || "var(--color-primary)",
                      }}
                      title={`${b.liveClass.title} — ${formatTime(new Date(b.liveClass.startsAt))}`}
                    >
                      <span className="font-medium">{b.liveClass.title}</span>
                      <br />
                      <span className="opacity-80">{formatTime(new Date(b.liveClass.startsAt))}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]/60">
            <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>
          </div>
        )}
      </div>

      {classes.length === 0 && !loading && (
        <div className="mt-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-[var(--color-text-muted)]">
            No hay clases esta semana. Creá una desde &quot;Nueva clase&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
