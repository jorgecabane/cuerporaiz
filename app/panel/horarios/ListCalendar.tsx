"use client";

import Link from "next/link";
import type { LiveClass } from "@/lib/domain";
import type { CalendarEvent } from "./WeekCalendar";

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateKey(d: Date): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

interface ListCalendarProps {
  classes: LiveClass[];
  events?: CalendarEvent[];
  loading: boolean;
}

export function ListCalendar({ classes, events = [], loading }: ListCalendarProps) {
  const grouped = new Map<string, LiveClass[]>();
  for (const c of classes) {
    const key = formatDateKey(c.startsAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  // Add event start days to grouped map structure (separate pass)
  const groupedEvents = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = formatDateKey(new Date(ev.startsAt));
    if (!groupedEvents.has(key)) groupedEvents.set(key, []);
    groupedEvents.get(key)!.push(ev);
  }

  const allDayKeys = new Set([...grouped.keys(), ...groupedEvents.keys()]);
  const sortedDays = Array.from(allDayKeys).sort((a, b) => a.localeCompare(b));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
              <div className="h-3.5 w-28 rounded bg-[var(--color-border)]/40" />
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {[...Array(2)].map((_, j) => (
                <li key={j} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3 w-3 rounded-full shrink-0 bg-[var(--color-border)]/40" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-36 rounded bg-[var(--color-border)]/40" />
                    <div className="h-3 w-48 rounded bg-[var(--color-border)]/30" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (sortedDays.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)]">
        <p className="text-[var(--color-text-muted)]">
          No hay clases ni eventos en los próximos 30 días.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDays.map((dateKey) => {
        const dayClasses = grouped.get(dateKey) ?? [];
        const dayEvents = groupedEvents.get(dateKey) ?? [];
        const firstClass = dayClasses[0];
        const firstEvent = dayEvents[0];
        const headlineDate = firstClass
          ? firstClass.startsAt
          : firstEvent
            ? new Date(firstEvent.startsAt)
            : new Date(dateKey);
        return (
          <div key={dateKey} className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
              <h3 className="text-sm font-semibold text-[var(--color-text)] capitalize">
                {formatDate(headlineDate)}
              </h3>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {dayEvents.map((ev) => (
                <li key={`ev-${ev.id}`}>
                  <Link
                    href={`/panel/eventos/${ev.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-primary-light)]/20 transition-colors"
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: ev.color ?? "var(--color-secondary)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Evento · {formatTime(new Date(ev.startsAt))}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">→</span>
                  </Link>
                </li>
              ))}
              {dayClasses.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/panel/horarios/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-primary-light)]/20 transition-colors"
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color || "var(--color-primary)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {c.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatTime(c.startsAt)} · {c.durationMinutes} min · {c.maxCapacity} cupos
                      </p>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
