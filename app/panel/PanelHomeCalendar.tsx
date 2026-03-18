"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Role } from "@/lib/domain/role";
import { isAdminRole, isStudentRole } from "@/lib/domain";
import type { LiveClassDto, ReservationDto, UserPlanOptionDto } from "@/lib/dto/reservation-dto";
import {
  WeekNav,
  getWeekBounds,
  WeekDaySelector,
  groupClassesByDay,
  ClassCard,
} from "@/components/panel/reservas";

const RESERVATIONS_PAGE_SIZE = 50;

export interface ClassAttendanceDto {
  reservationId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  status: string;
}

interface PanelHomeCalendarProps {
  centerId: string;
  weekStartDay: number;
  role: Role;
}

export function PanelHomeCalendar({
  centerId,
  weekStartDay,
  role,
}: PanelHomeCalendarProps) {
  const [liveClasses, setLiveClasses] = useState<LiveClassDto[]>([]);
  const [staffClassesOnly, setStaffClassesOnly] = useState<LiveClassDto[]>([]);
  const [staffAttendeesByClass, setStaffAttendeesByClass] = useState<Record<string, ClassAttendanceDto[]>>({});
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planSelectionFor, setPlanSelectionFor] = useState<{
    liveClassId: string;
    plans: UserPlanOptionDto[];
  } | null>(null);
  const [students, setStudents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [reserveForUserId, setReserveForUserId] = useState("");
  const [reserveForClassId, setReserveForClassId] = useState("");
  const [reserveForStudentLoading, setReserveForStudentLoading] = useState(false);
  const [cancelReservationLoadingId, setCancelReservationLoadingId] = useState<string | null>(null);
  const [planSelectionForStudent, setPlanSelectionForStudent] = useState<{
    userId: string;
    liveClassId: string;
    plans: UserPlanOptionDto[];
  } | null>(null);
  const [attendanceLoadingId, setAttendanceLoadingId] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    const res = await fetch(`/api/reservations?page=1&pageSize=${RESERVATIONS_PAGE_SIZE}`);
    if (!res.ok) return;
    const data = await res.json();
    setReservations(Array.isArray(data.items) ? data.items : []);
  }, []);

  const loadClassesForWeek = useCallback(
    async (anchor: Date) => {
      const { start, end } = getWeekBounds(anchor, weekStartDay);
      const res = await fetch(
        `/api/reservations/live-classes?from=${start.toISOString()}&to=${end.toISOString()}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setLiveClasses(Array.isArray(data.items) ? data.items : []);
    },
    [weekStartDay]
  );

  const loadStaffClassesForWeek = useCallback(
    async (anchor: Date) => {
      const { start, end } = getWeekBounds(anchor, weekStartDay);
      const res = await fetch(
        `/api/panel/staff/calendar-classes?from=${start.toISOString()}&to=${end.toISOString()}`
      );
      if (!res.ok) {
        setStaffClassesOnly([]);
        setStaffAttendeesByClass({});
        return;
      }
      const data = await res.json();
      setStaffClassesOnly(Array.isArray(data.items) ? data.items : []);
      setStaffAttendeesByClass({});
    },
    [weekStartDay]
  );

  const loadStaffAttendeesForDay = useCallback(async (dayKey: string) => {
    const byDay = groupClassesByDay(staffClassesOnly);
    const classesOfDay = byDay.get(dayKey) ?? [];
    if (classesOfDay.length === 0) return;
    const results = await Promise.all(
      classesOfDay.map(async (c) => {
        const attRes = await fetch(`/api/admin/attendance?liveClassId=${encodeURIComponent(c.id)}`);
        const raw = attRes.ok ? await attRes.json() : [];
        const attendees: ClassAttendanceDto[] = Array.isArray(raw) ? raw : [];
        return { id: c.id, attendees } as const;
      })
    );
    setStaffAttendeesByClass((prev) => {
      const next = { ...prev };
      for (const { id, attendees } of results) next[id] = attendees;
      return next;
    });
  }, [staffClassesOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isStudentRole(role)) {
        await Promise.all([loadReservations(), loadClassesForWeek(weekAnchor)]);
      } else {
        await loadStaffClassesForWeek(weekAnchor);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [role, loadReservations, loadClassesForWeek, loadStaffClassesForWeek, weekAnchor]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAdminRole(role) && reserveForClassId && students.length === 0) {
      fetch("/api/panel/staff/students")
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setStudents(Array.isArray(list) ? list : []))
        .catch(() => setStudents([]));
    }
  }, [role, reserveForClassId, students.length]);

  const handleWeekChange = useCallback(
    (start: Date) => {
      setWeekAnchor(start);
      if (isStudentRole(role)) {
        loadClassesForWeek(start);
      } else {
        loadStaffClassesForWeek(start);
      }
    },
    [role, loadClassesForWeek, loadStaffClassesForWeek]
  );

  const { start: weekStart } = useMemo(
    () => getWeekBounds(weekAnchor, weekStartDay),
    [weekAnchor, weekStartDay]
  );
  const weekDayKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
  }, [weekStart]);

  const liveClassesByDay = useMemo(() => groupClassesByDay(liveClasses), [liveClasses]);
  const staffByDay = useMemo(() => groupClassesByDay(staffClassesOnly), [staffClassesOnly]);

  const classCountByDay = useMemo(() => {
    const count: Record<string, number> = {};
    if (isStudentRole(role)) {
      liveClassesByDay.forEach((_arr, key) => {
        count[key] = liveClassesByDay.get(key)?.length ?? 0;
      });
    } else {
      staffByDay.forEach((_arr, key) => {
        count[key] = staffByDay.get(key)?.length ?? 0;
      });
    }
    return count;
  }, [role, liveClassesByDay, staffByDay]);

  const effectiveSelectedDay = useMemo(() => {
    if (selectedDay && weekDayKeys.includes(selectedDay)) return selectedDay;
    const today = new Date().toISOString().slice(0, 10);
    if (weekDayKeys.includes(today)) return today;
    return weekDayKeys[0] ?? null;
  }, [selectedDay, weekDayKeys]);

  const classesForSelectedDay = useMemo(() => {
    if (isStudentRole(role)) {
      return liveClassesByDay.get(effectiveSelectedDay ?? "") ?? [];
    }
    const classes = staffByDay.get(effectiveSelectedDay ?? "") ?? [];
    return classes.map((c) => ({
      class: c,
      attendees: staffAttendeesByClass[c.id] ?? [],
    }));
  }, [role, effectiveSelectedDay, liveClassesByDay, staffByDay, staffAttendeesByClass]);

  useEffect(() => {
    if (!isStudentRole(role) && effectiveSelectedDay && staffClassesOnly.length > 0) {
      loadStaffAttendeesForDay(effectiveSelectedDay);
    }
  }, [role, effectiveSelectedDay, staffClassesOnly.length, loadStaffAttendeesForDay]);

  const myConfirmedLiveClassIds = useMemo(
    () =>
      new Set(
        reservations.filter((r) => r.status === "CONFIRMED").map((r) => r.liveClassId)
      ),
    [reservations]
  );

  async function handleReserve(liveClassId: string, userPlanId?: string) {
    setActionLoading(liveClassId);
    setPlanSelectionFor(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId, ...(userPlanId && { userPlanId }) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (
          res.status === 422 &&
          data.code === "PLAN_SELECTION_REQUIRED" &&
          Array.isArray(data.plans) &&
          data.plans.length > 0
        ) {
          setPlanSelectionFor({ liveClassId, plans: data.plans });
          return;
        }
        return;
      }
      await loadReservations();
      await loadClassesForWeek(weekAnchor);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReserveForStudent(
    userId: string,
    liveClassId: string,
    userPlanId?: string
  ) {
    setReserveForStudentLoading(true);
    setPlanSelectionForStudent(null);
    try {
      const res = await fetch("/api/admin/reserve-for-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, liveClassId, userPlanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (
          res.status === 422 &&
          data.code === "PLAN_SELECTION_REQUIRED" &&
          Array.isArray(data.plans) &&
          data.plans.length > 0
        ) {
          setPlanSelectionForStudent({ userId, liveClassId, plans: data.plans });
          setReserveForStudentLoading(false);
          return;
        }
        setReserveForStudentLoading(false);
        return;
      }
      setReserveForUserId("");
      setReserveForClassId("");
      await loadStaffClassesForWeek(weekAnchor);
    } finally {
      setReserveForStudentLoading(false);
    }
  }

  async function handleCancelReservationForUser(reservationId: string) {
    setCancelReservationLoadingId(reservationId);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/cancel`, {
        method: "PATCH",
      });
      if (res.ok) await loadStaffClassesForWeek(weekAnchor);
    } finally {
      setCancelReservationLoadingId(null);
    }
  }

  async function handleMarkAttendance(
    reservationId: string,
    status: "ATTENDED" | "NO_SHOW"
  ) {
    setAttendanceLoadingId(reservationId);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, status }),
      });
      if (res.ok) await loadStaffClassesForWeek(weekAnchor);
    } finally {
      setAttendanceLoadingId(null);
    }
  }

  const isStudent = isStudentRole(role);

  if (loading && liveClasses.length === 0 && staffClassesOnly.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="h-10 w-full rounded bg-[var(--color-border)]/40 animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-[var(--radius-md)] bg-[var(--color-border)]/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WeekNav
        weekAnchor={weekAnchor}
        weekStartDay={weekStartDay}
        onWeekChange={handleWeekChange}
        allowPastWeeks={true}
        className="mb-2"
      />
      <WeekDaySelector
        weekAnchor={weekAnchor}
        weekStartDay={weekStartDay}
        selectedDate={effectiveSelectedDay}
        onSelectDay={setSelectedDay}
        classCountByDay={classCountByDay}
        className="mb-4"
      />

      {planSelectionFor && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          role="dialog"
          aria-labelledby="plan-selection-title"
        >
          <h3 id="plan-selection-title" className="font-medium text-[var(--color-text)] mb-2">
            Elige con qué plan reservar
          </h3>
          <ul className="space-y-2 mb-3">
            {planSelectionFor.plans.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    handleReserve(planSelectionFor.liveClassId, p.id);
                    setPlanSelectionFor(null);
                  }}
                  disabled={actionLoading !== null}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left text-sm hover:bg-[var(--color-border)]/30 cursor-pointer disabled:opacity-50"
                >
                  {p.planName ?? "Plan"} ·{" "}
                  {p.classesTotal != null
                    ? `${p.classesUsed}/${p.classesTotal} clases`
                    : "Ilimitado"}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPlanSelectionFor(null)}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {planSelectionForStudent && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          role="dialog"
          aria-labelledby="plan-selection-student-title"
        >
          <h3 id="plan-selection-student-title" className="font-medium text-[var(--color-text)] mb-2">
            Elige con qué plan reservar para el estudiante
          </h3>
          <ul className="space-y-2 mb-3">
            {planSelectionForStudent.plans.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    handleReserveForStudent(
                      planSelectionForStudent.userId,
                      planSelectionForStudent.liveClassId,
                      p.id
                    );
                    setPlanSelectionForStudent(null);
                  }}
                  disabled={reserveForStudentLoading}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left text-sm hover:bg-[var(--color-border)]/30 cursor-pointer disabled:opacity-50"
                >
                  {p.planName ?? "Plan"}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPlanSelectionForStudent(null)}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {classesForSelectedDay.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            No hay clases este día.
          </p>
        </div>
      ) : isStudent ? (
        <ul className="space-y-3">
          {(classesForSelectedDay as LiveClassDto[]).map((c) => (
            <ClassCard
              key={c.id}
              class={c}
              isPast={new Date(c.startsAt) < new Date()}
              alreadyReserved={myConfirmedLiveClassIds.has(c.id)}
              onReserve={handleReserve}
              actionLoadingId={actionLoading}
            />
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {(classesForSelectedDay as Array<{ class: LiveClassDto; attendees: ClassAttendanceDto[] }>).map(
            ({ class: c, attendees }) => (
              <ClassCard
                key={c.id}
                class={c}
                isPast={new Date(c.startsAt) < new Date()}
                attendees={attendees}
                onMarkAttendance={handleMarkAttendance}
                attendanceLoadingId={attendanceLoadingId}
                isAdmin={isAdminRole(role)}
                onCancelReservation={
                  isAdminRole(role) ? handleCancelReservationForUser : undefined
                }
                cancelReservationLoadingId={cancelReservationLoadingId}
                onReserveForStudent={
                  isAdminRole(role) ? (id) => setReserveForClassId(id) : undefined
                }
                reserveForStudentLoading={reserveForStudentLoading}
                studentsForPicker={isAdminRole(role) ? students : undefined}
                reserveForClassId={reserveForClassId || null}
                reserveForUserId={reserveForUserId}
                setReserveForUserId={setReserveForUserId}
                onReserveForStudentSubmit={handleReserveForStudent}
                onCloseReserveForStudent={() => {
                  setReserveForClassId("");
                  setReserveForUserId("");
                }}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}
