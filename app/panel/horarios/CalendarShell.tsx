"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LiveClass, Discipline } from "@/lib/domain";
import type { Instructor } from "@/lib/ports/instructor-repository";
import { CalendarSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { WeekCalendar } from "./WeekCalendar";
import { DayCalendar } from "./DayCalendar";
import { MonthCalendar } from "./MonthCalendar";
import { ListCalendar } from "./ListCalendar";

type ViewMode = "day" | "week" | "month" | "list";

const VIEW_LABELS: Record<ViewMode, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  list: "Lista",
};

interface Filters {
  disciplineId: string | null;
  instructorId: string | null;
  mode: "all" | "physical" | "online";
}

interface Props {
  centerId: string;
  calendarStartHour: number;
  calendarEndHour: number;
  weekStartDay: number;
  disciplines: Discipline[];
  instructors: Instructor[];
}

function startOfWeek(d: Date, weekStartDay: number): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function CalendarShell({
  calendarStartHour,
  calendarEndHour,
  weekStartDay,
  disciplines,
  instructors,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    disciplineId: null,
    instructorId: null,
    mode: "all",
  });

  const dateRange = useCallback((): { from: Date; to: Date } => {
    switch (view) {
      case "day":
        return { from: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()), to: addDays(currentDate, 1) };
      case "week": {
        const ws = startOfWeek(currentDate, weekStartDay);
        return { from: ws, to: addDays(ws, 7) };
      }
      case "month": {
        const ms = startOfMonth(currentDate);
        const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
        return { from: ms, to: addDays(me, 1) };
      }
      case "list":
        return { from: new Date(), to: addDays(new Date(), 30) };
    }
  }, [view, currentDate, weekStartDay]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = dateRange();
    try {
      const [classRes, holidayRes] = await Promise.all([
        fetch(`/api/admin/live-classes?from=${from.toISOString()}&to=${to.toISOString()}`),
        fetch("/api/admin/holidays"),
      ]);
      if (classRes.ok) {
        const data = await classRes.json();
        setClasses(Array.isArray(data) ? data : []);
      }
      if (holidayRes.ok) {
        const hdata = await holidayRes.json();
        const dates = new Set<string>(
          (Array.isArray(hdata) ? hdata : []).map((h: { date: string }) =>
            new Date(h.date).toISOString().slice(0, 10)
          )
        );
        setHolidayDates(dates);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredClasses = classes.filter((c) => {
    if (filters.disciplineId && c.disciplineId !== filters.disciplineId) return false;
    if (filters.instructorId && c.instructorId !== filters.instructorId) return false;
    if (filters.mode === "physical" && c.isOnline) return false;
    if (filters.mode === "online" && !c.isOnline) return false;
    return true;
  });

  function navigate(dir: -1 | 0 | 1) {
    if (dir === 0) {
      setCurrentDate(new Date());
      return;
    }
    const d = new Date(currentDate);
    switch (view) {
      case "day": d.setDate(d.getDate() + dir); break;
      case "week": d.setDate(d.getDate() + dir * 7); break;
      case "month": d.setMonth(d.getMonth() + dir); break;
      case "list": d.setDate(d.getDate() + dir * 30); break;
    }
    setCurrentDate(d);
  }

  function getDateLabel(): string {
    switch (view) {
      case "day":
        return currentDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
      case "week": {
        const ws = startOfWeek(currentDate, weekStartDay);
        return `${formatShortDate(ws)} — ${formatShortDate(addDays(ws, 6))}`;
      }
      case "month":
        return formatMonthYear(currentDate);
      case "list":
        return "Próximos 30 días";
    }
  }

  function handleSlotClick(dayDate: Date, hour: number) {
    const y = dayDate.getFullYear();
    const m = String(dayDate.getMonth() + 1).padStart(2, "0");
    const day = String(dayDate.getDate()).padStart(2, "0");
    router.push(`/panel/horarios/nueva?date=${y}-${m}-${day}&hour=${hour}`);
  }

  function handleDayClick(dayDate: Date) {
    const y = dayDate.getFullYear();
    const m = String(dayDate.getMonth() + 1).padStart(2, "0");
    const day = String(dayDate.getDate()).padStart(2, "0");
    router.push(`/panel/horarios/nueva?date=${y}-${m}-${day}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          Horarios
        </h1>
        <Link
          href="/panel/horarios/nueva"
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          + Nueva clase
        </Link>
      </div>

      {/* View switcher + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* View tabs */}
        <div className="flex rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
          {(["day", "week", "month", "list"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Filters */}
        <select
          value={filters.disciplineId ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, disciplineId: e.target.value || null }))}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text)]"
        >
          <option value="">Todas las disciplinas</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={filters.instructorId ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, instructorId: e.target.value || null }))}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text)]"
        >
          <option value="">Todos los profesores</option>
          {instructors.map((inst) => (
            <option key={inst.id} value={inst.userId}>{inst.name || inst.email}</option>
          ))}
        </select>

        <select
          value={filters.mode}
          onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value as Filters["mode"] }))}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text)]"
        >
          <option value="all">Presencial + Online</option>
          <option value="physical">Solo presencial</option>
          <option value="online">Solo online</option>
        </select>
      </div>

      {/* Navigation */}
      {view !== "list" && (
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-primary-light)]"
          >
            ← Anterior
          </button>
          <div className="text-sm font-medium text-[var(--color-text)] capitalize">
            {getDateLabel()}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(0)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-primary-light)]"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-primary-light)]"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* View content */}
      {loading && classes.length === 0 ? (
        view === "list" ? <ListSkeleton /> : <CalendarSkeleton />
      ) : (
        <>
          {view === "week" && (
            <WeekCalendar
              classes={filteredClasses}
              holidayDates={holidayDates}
              calendarStartHour={calendarStartHour}
              calendarEndHour={calendarEndHour}
              currentDate={currentDate}
              weekStartDay={weekStartDay}
              loading={loading}
              onSlotClick={handleSlotClick}
            />
          )}
          {view === "day" && (
            <DayCalendar
              classes={filteredClasses}
              holidayDates={holidayDates}
              calendarStartHour={calendarStartHour}
              calendarEndHour={calendarEndHour}
              currentDate={currentDate}
              loading={loading}
              onSlotClick={handleSlotClick}
            />
          )}
          {view === "month" && (
            <MonthCalendar
              classes={filteredClasses}
              holidayDates={holidayDates}
              currentDate={currentDate}
              weekStartDay={weekStartDay}
              loading={loading}
              onDayClick={handleDayClick}
            />
          )}
          {view === "list" && (
            <ListCalendar
              classes={filteredClasses}
              loading={loading}
            />
          )}
        </>
      )}
    </div>
  );
}
