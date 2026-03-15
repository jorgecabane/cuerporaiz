"use client";

import Link from "next/link";
import type { LiveClass } from "@/lib/domain";
import { layoutBlocks } from "./calendar-layout";

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DayCalendarProps {
  classes: LiveClass[];
  holidayDates: Set<string>;
  calendarStartHour: number;
  calendarEndHour: number;
  currentDate: Date;
  loading: boolean;
  onSlotClick: (dayDate: Date, hour: number) => void;
}

export function DayCalendar({
  classes,
  holidayDates,
  calendarStartHour,
  calendarEndHour,
  currentDate,
  loading,
  onSlotClick,
}: DayCalendarProps) {
  const totalHours = calendarEndHour - calendarStartHour;
  const HOURS = Array.from({ length: totalHours }, (_, i) => i + calendarStartHour);
  const now = new Date();
  const isHoliday = holidayDates.has(formatDateParam(currentDate));

  function isSlotPast(hour: number): boolean {
    const slotDate = new Date(currentDate);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < now;
  }

  const blocks = layoutBlocks(classes, calendarStartHour, totalHours);

  return (
    <div>
      {isHoliday && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-2 text-sm text-[var(--color-error)]">
          Este día es feriado — no se pueden crear clases.
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden">
        <div className="grid grid-cols-[3.5rem_1fr] relative" style={{ minHeight: `${HOURS.length * 3.5}rem` }}>
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

          {/* Day column */}
          <div className="relative border-l border-[var(--color-border)]">
            {HOURS.map((h) => {
              const past = isSlotPast(h);
              const blocked = past || isHoliday;
              return (
                <div
                  key={h}
                  className={`absolute left-0 right-0 border-t border-[var(--color-border)]/30 ${
                    isHoliday
                      ? "bg-[var(--color-error)]/5 cursor-default"
                      : blocked
                        ? "bg-[var(--color-border)]/15 cursor-default"
                        : "cursor-pointer hover:bg-[var(--color-primary-light)]/30 transition-colors"
                  }`}
                  style={{ top: `${((h - calendarStartHour) / totalHours) * 100}%`, height: `${(1 / totalHours) * 100}%` }}
                  onClick={blocked ? undefined : () => onSlotClick(currentDate, h)}
                />
              );
            })}
            {blocks.map((b) => {
              const widthPercent = 100 / b.totalColumns;
              const leftPercent = b.column * widthPercent;
              return (
                <Link
                  key={b.liveClass.id}
                  href={`/panel/horarios/${b.liveClass.id}`}
                  className="absolute rounded-[var(--radius-sm)] px-3 py-1 text-sm text-white overflow-hidden hover:opacity-90 transition-opacity z-[1] border-r border-[var(--color-surface)]/30"
                  style={{
                    top: `${b.topPercent}%`,
                    height: `${Math.max(b.heightPercent, 1.5)}%`,
                    left: `calc(${leftPercent}% + 2px)`,
                    width: `calc(${widthPercent}% - 4px)`,
                    backgroundColor: b.liveClass.color || "var(--color-primary)",
                  }}
                >
                  <span className="font-medium">{b.liveClass.title}</span>
                  <span className="ml-2 opacity-80">{formatTime(new Date(b.liveClass.startsAt))}</span>
                  {b.totalColumns === 1 && (
                    <span className="ml-2 opacity-60">{b.liveClass.durationMinutes} min</span>
                  )}
                </Link>
              );
            })}
          </div>
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
            No hay clases este día.
          </p>
        </div>
      )}
    </div>
  );
}
