"use client";

import Link from "next/link";
import type { LiveClass } from "@/lib/domain";

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
  loading: boolean;
}

export function ListCalendar({ classes, loading }: ListCalendarProps) {
  const grouped = new Map<string, LiveClass[]>();
  for (const c of classes) {
    const key = formatDateKey(c.startsAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  const sortedDays = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)]">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>
      </div>
    );
  }

  if (sortedDays.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)]">
        <p className="text-[var(--color-text-muted)]">
          No hay clases en los próximos 30 días.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDays.map(([dateKey, dayClasses]) => (
        <div key={dateKey} className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <h3 className="text-sm font-semibold text-[var(--color-text)] capitalize">
              {formatDate(dayClasses[0].startsAt)}
            </h3>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
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
      ))}
    </div>
  );
}
