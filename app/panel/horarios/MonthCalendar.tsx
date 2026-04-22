"use client";

import Link from "next/link";
import type { LiveClass } from "@/lib/domain";
import type { CalendarEvent } from "./WeekCalendar";

const ALL_DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function orderedDayLabels(weekStartDay: number): string[] {
  return Array.from({ length: 7 }, (_, i) => ALL_DAY_LABELS[(weekStartDay + i) % 7]);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthGrid(year: number, month: number, weekStartDay: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = (firstDay.getDay() - weekStartDay + 7) % 7;

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(startOffset).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
}

interface MonthCalendarProps {
  classes: LiveClass[];
  events?: CalendarEvent[];
  holidayDates: Set<string>;
  currentDate: Date;
  weekStartDay: number;
  loading: boolean;
  onDayClick: (dayDate: Date) => void;
}

export function MonthCalendar({
  classes,
  events = [],
  holidayDates,
  currentDate,
  weekStartDay,
  loading,
  onDayClick,
}: MonthCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const weeks = getMonthGrid(year, month, weekStartDay);
  const now = new Date();
  const todayKey = formatDateKey(now);
  const dayLabels = orderedDayLabels(weekStartDay);

  const classesByDay = new Map<string, LiveClass[]>();
  for (const c of classes) {
    const key = formatDateKey(new Date(c.startsAt));
    if (!classesByDay.has(key)) classesByDay.set(key, []);
    classesByDay.get(key)!.push(c);
  }

  // Build a map of date -> events that overlap that day
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const start = new Date(ev.startsAt);
    const end = new Date(ev.endsAt);
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      const key = formatDateKey(cursor);
      if (!eventsByDay.has(key)) eventsByDay.set(key, []);
      eventsByDay.get(key)!.push(ev);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return (
    <div>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
          {dayLabels.map((label, i) => (
            <div key={i} className="p-2 text-center text-xs font-medium text-[var(--color-text-muted)] border-l first:border-l-0 border-[var(--color-border)]">
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 border-[var(--color-border)]">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="min-h-[5rem] border-l first:border-l-0 border-[var(--color-border)] bg-[var(--color-bg)]/30" />;
              }
              const dateKey = formatDateKey(day);
              const isToday = dateKey === todayKey;
              const isHoliday = holidayDates.has(dateKey);
              const isPast = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const dayClasses = classesByDay.get(dateKey) || [];

              const clickable = !isPast && !isHoliday;
              const dayEvents = eventsByDay.get(dateKey) ?? [];

              return (
                <div
                  key={di}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onDayClick(day) : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter") onDayClick(day); } : undefined}
                  className={`min-h-[5rem] p-1 border-l first:border-l-0 border-[var(--color-border)] ${
                    isHoliday
                      ? "bg-[var(--color-error)]/5"
                      : isPast
                        ? "bg-[var(--color-border)]/10"
                        : "cursor-pointer hover:bg-[var(--color-primary-light)]/30 transition-colors"
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                      : isHoliday
                        ? "text-[var(--color-error)]"
                        : isPast
                          ? "text-[var(--color-text-muted)]/50"
                          : "text-[var(--color-text)]"
                  }`}>
                    {day.getDate()}
                  </div>
                  {isHoliday && (
                    <div className="text-[0.55rem] text-[var(--color-error)] leading-tight mb-0.5">Feriado</div>
                  )}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 1).map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/panel/eventos/${ev.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block rounded-full px-1 py-0.5 text-[0.6rem] leading-tight text-white truncate hover:opacity-90"
                        style={{ backgroundColor: ev.color ?? "var(--color-secondary)" }}
                      >
                        {ev.title}
                      </Link>
                    ))}
                    {dayClasses.slice(0, 2).map((c) => (
                      <Link
                        key={c.id}
                        href={`/panel/horarios/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block rounded-sm px-1 py-0.5 text-[0.6rem] leading-tight text-white truncate hover:opacity-90"
                        style={{ backgroundColor: c.color || "var(--color-primary)" }}
                      >
                        {formatTime(new Date(c.startsAt))} {c.title}
                      </Link>
                    ))}
                    {dayClasses.length + dayEvents.length > 3 && (
                      <p className="text-[0.55rem] text-[var(--color-text-muted)] px-1">
                        +{dayClasses.length + dayEvents.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
