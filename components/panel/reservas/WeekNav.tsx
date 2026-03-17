"use client";

import { useCallback } from "react";

function getWeekBounds(date: Date, weekStartDay: number): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatWeekLabel(start: Date, end: Date): string {
  return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString("es-CL", { month: "short" })}`;
}

export interface WeekNavProps {
  /** Fecha cualquiera dentro de la semana actualmente mostrada */
  weekAnchor: Date;
  /** 0 = domingo, 1 = lunes (por center.calendarWeekStartDay) */
  weekStartDay?: number;
  onWeekChange: (start: Date, end: Date) => void;
  /** Si true, no permitir navegar a semanas pasadas */
  allowPastWeeks?: boolean;
  className?: string;
}

export function WeekNav({
  weekAnchor,
  weekStartDay = 1,
  onWeekChange,
  allowPastWeeks = true,
  className = "",
}: WeekNavProps) {
  const { start, end } = getWeekBounds(weekAnchor, weekStartDay);

  const goPrev = useCallback(() => {
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevStart.getDate() + 6);
    prevEnd.setHours(23, 59, 59, 999);
    onWeekChange(prevStart, prevEnd);
  }, [start, onWeekChange]);

  const goNext = useCallback(() => {
    const nextStart = new Date(start);
    nextStart.setDate(nextStart.getDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 6);
    nextEnd.setHours(23, 59, 59, 999);
    onWeekChange(nextStart, nextEnd);
  }, [start, onWeekChange]);

  const now = new Date();
  const canGoPrev = allowPastWeeks || start > now;

  return (
    <nav
      className={`flex items-center justify-between gap-4 ${className}`}
      aria-label="Navegación por semana"
    >
      <button
        type="button"
        onClick={goPrev}
        disabled={!canGoPrev}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Semana anterior
      </button>
      <span className="text-sm font-medium text-[var(--color-text)] tabular-nums">
        Semana {formatWeekLabel(start, end)}
      </span>
      <button
        type="button"
        onClick={goNext}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]/50 cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Semana siguiente
      </button>
    </nav>
  );
}

export { getWeekBounds };
