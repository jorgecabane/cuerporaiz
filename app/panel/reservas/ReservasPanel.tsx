"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Role } from "@/lib/domain/role";
import type { LiveClassDto, ReservationDto, UserPlanOptionDto } from "@/lib/dto/reservation-dto";
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  WeekNav,
  getWeekBounds,
  WeekDaySelector,
  groupClassesByDay,
  ClassCard,
  ReservationsList,
  segmentReservations,
  canCancelReservation,
  TAB_HOY,
  TAB_PROXIMAS,
  TAB_CANCELADAS,
  TAB_HISTORICAS,
} from "@/components/panel/reservas";

const RESERVATIONS_PAGE_SIZE = 50;
const WEEK_START_DAY_DEFAULT = 1;

type PanelRole = Role;

export interface ClassAttendanceDto {
  reservationId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  status: string;
}

interface ReservasPanelProps {
  role: PanelRole;
  centerId: string;
  weekStartDay?: number;
}

export function ReservasPanel({
  role,
  centerId,
  weekStartDay = WEEK_START_DAY_DEFAULT,
}: ReservasPanelProps) {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [reservationsTotal, setReservationsTotal] = useState(0);
  const [liveClasses, setLiveClasses] = useState<LiveClassDto[]>([]);
  /** Staff: solo clases de la semana (sin asistencia). La asistencia se pide por día activo. */
  const [staffClassesOnly, setStaffClassesOnly] = useState<LiveClassDto[]>([]);
  /** Staff: mapa liveClassId -> attendees, rellenado solo para el día seleccionado */
  const [staffAttendeesByClass, setStaffAttendeesByClass] = useState<Record<string, ClassAttendanceDto[]>>({});
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [reserveError, setReserveError] = useState<{
    code: string;
    message: string;
    plans?: UserPlanOptionDto[];
    liveClassId?: string;
  } | null>(null);
  const [planSelectionFor, setPlanSelectionFor] = useState<{
    liveClassId: string;
    plans: UserPlanOptionDto[];
  } | null>(null);
  const [attendanceLoadingId, setAttendanceLoadingId] = useState<string | null>(null);
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
  const [showTrialCta, setShowTrialCta] = useState(false);
  const [mainTab, setMainTab] = useState("reservas");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function showMessage(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  const loadReservations = useCallback(async () => {
    const res = await fetch(
      `/api/reservations?page=1&pageSize=${RESERVATIONS_PAGE_SIZE}`
    );
    if (!res.ok) return;
    const data = await res.json();
    setReservations(Array.isArray(data.items) ? data.items : []);
    setReservationsTotal(typeof data.total === "number" ? data.total : 0);
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
      const classes: LiveClassDto[] = Array.isArray(data.items) ? data.items : [];
      setStaffClassesOnly(classes);
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
        const attRes = await fetch(
          `/api/admin/attendance?liveClassId=${encodeURIComponent(c.id)}`
        );
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
    setError(null);
    try {
      if (role === "STUDENT") {
        await loadReservations();
        await loadClassesForWeek(weekAnchor);
      } else {
        await loadStaffClassesForWeek(weekAnchor);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [role, loadReservations, loadClassesForWeek, loadStaffClassesForWeek, weekAnchor]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (role === "STUDENT") {
      fetch("/api/reservations/can-show-trial-cta")
        .then((r) => (r.ok ? r.json() : {}))
        .then((data: { showTrialCta?: boolean }) => setShowTrialCta(Boolean(data.showTrialCta)))
        .catch(() => setShowTrialCta(false));
    }
  }, [role]);

  useEffect(() => {
    if (role === "ADMINISTRATOR" && reserveForClassId && students.length === 0) {
      fetch("/api/panel/staff/students")
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setStudents(Array.isArray(list) ? list : []))
        .catch(() => setStudents([]));
    }
  }, [role, reserveForClassId, students.length]);

  const handleWeekChange = useCallback(
    (start: Date) => {
      setWeekAnchor(start);
      if (role === "STUDENT") {
        loadClassesForWeek(start);
      } else {
        loadStaffClassesForWeek(start);
      }
    },
    [role, loadClassesForWeek, loadStaffClassesForWeek]
  );

  const onWeekChange = useCallback(
    (start: Date, _end: Date) => handleWeekChange(start),
    [handleWeekChange]
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
    if (role === "STUDENT") {
      liveClassesByDay.forEach((arr, key) => { count[key] = arr.length; });
    } else {
      staffByDay.forEach((arr, key) => { count[key] = arr.length; });
    }
    return count;
  }, [role, liveClassesByDay, staffByDay]);

  const effectiveSelectedDay = useMemo(() => {
    if (selectedDay && (liveClassesByDay.has(selectedDay) || staffByDay.has(selectedDay) || weekDayKeys.includes(selectedDay)))
      return selectedDay;
    const today = new Date().toISOString().slice(0, 10);
    if (weekDayKeys.includes(today)) return today;
    return weekDayKeys[0] ?? null;
  }, [selectedDay, weekDayKeys, liveClassesByDay, staffByDay]);

  const classesForSelectedDay = useMemo(() => {
    if (role === "STUDENT") {
      return liveClassesByDay.get(effectiveSelectedDay ?? "") ?? [];
    }
    const classes = staffByDay.get(effectiveSelectedDay ?? "") ?? [];
    return classes.map((c) => ({
      class: c,
      attendees: staffAttendeesByClass[c.id] ?? [],
    }));
  }, [role, effectiveSelectedDay, liveClassesByDay, staffByDay, staffAttendeesByClass]);

  useEffect(() => {
    if (role !== "STUDENT" && effectiveSelectedDay && staffClassesOnly.length > 0) {
      loadStaffAttendeesForDay(effectiveSelectedDay);
    }
  }, [role, effectiveSelectedDay, staffClassesOnly.length, loadStaffAttendeesForDay]);

  async function handleReserveForStudent(
    userId: string,
    liveClassId: string,
    userPlanId?: string
  ) {
    setReserveForStudentLoading(true);
    setMessage(null);
    setPlanSelectionForStudent(null);
    try {
      const res = await fetch("/api/admin/reserve-for-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, liveClassId, userPlanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data.code === "PLAN_SELECTION_REQUIRED" && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlanSelectionForStudent({ userId, liveClassId, plans: data.plans });
          setReserveForStudentLoading(false);
          return;
        }
        showMessage("err", data.message ?? "Error al reservar");
        setReserveForStudentLoading(false);
        return;
      }
      showMessage("ok", "Reserva confirmada para la alumna");
      setReserveForUserId("");
      setReserveForClassId("");
      await loadStaffClassesForWeek(weekAnchor);
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setReserveForStudentLoading(false);
    }
  }

  async function handleCancelReservationForUser(reservationId: string) {
    setCancelReservationLoadingId(reservationId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage("err", data.message ?? "Error al cancelar reserva");
        return;
      }
      showMessage("ok", "Reserva cancelada");
      await loadStaffClassesForWeek(weekAnchor);
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setCancelReservationLoadingId(null);
    }
  }

  function openReserveForStudentModal(liveClassId: string) {
    setReserveForClassId(liveClassId);
  }

  async function handleMarkAttendance(
    reservationId: string,
    status: "ATTENDED" | "NO_SHOW"
  ) {
    setAttendanceLoadingId(reservationId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showMessage("err", data.error ?? "Error al marcar asistencia");
        return;
      }
      showMessage("ok", status === "ATTENDED" ? "Marcada como presente" : "Marcada como ausente");
      await loadStaffClassesForWeek(weekAnchor);
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setAttendanceLoadingId(null);
    }
  }

  const myConfirmedLiveClassIds = new Set(
    reservations
      .filter((r) => r.status === "CONFIRMED")
      .map((r) => r.liveClassId)
  );

  const segmentedReservations = useMemo(
    () => segmentReservations(reservations),
    [reservations]
  );
  const canCancelIds = useMemo(
    () => new Set(reservations.filter(canCancelReservation).map((r) => r.id)),
    [reservations]
  );

  async function handleReserve(liveClassId: string, userPlanId?: string) {
    setActionLoading(liveClassId);
    setMessage(null);
    setReserveError(null);
    setPlanSelectionFor(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId, ...(userPlanId && { userPlanId }) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data.code === "PLAN_SELECTION_REQUIRED" && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlanSelectionFor({ liveClassId, plans: data.plans });
          return;
        }
        if (
          (res.status === 400 || res.status === 422) &&
          (data.code === "NO_ACTIVE_PLAN" || data.code === "PLAN_SELECTION_REQUIRED")
        ) {
          setReserveError({
            code: data.code,
            message: data.message ?? "Para reservar necesitás un plan activo.",
            plans: data.plans,
            liveClassId,
          });
          return;
        }
        showMessage("err", data.message ?? "Error al reservar");
        return;
      }
      showMessage("ok", "Reserva confirmada");
      await loadReservations();
      await loadClassesForWeek(weekAnchor);
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(reservationId: string) {
    setActionLoading(reservationId);
    setMessage(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage("err", data.message ?? "Error al cancelar");
        return;
      }
      showMessage("ok", "Reserva cancelada");
      await loadReservations();
      await loadClassesForWeek(weekAnchor);
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  const isStudent = role === "STUDENT";

  if (loading && reservations.length === 0 && liveClasses.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6 h-4 w-24 rounded bg-[var(--color-border)]/60 animate-pulse" />
        <div className="mb-6 h-8 w-64 rounded bg-[var(--color-border)]/60 animate-pulse" />
        <div className="h-10 w-full rounded bg-[var(--color-border)]/40 animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/panel"
          className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Mi cuenta
        </Link>
      </div>
      <h1 className="font-display text-section text-[var(--color-primary)] mb-6">
        Clases en vivo y reservas
      </h1>

      {message && (
        <p
          role="alert"
          className={`mb-4 rounded-[var(--radius-md)] px-4 py-2 text-sm ${
            message.type === "ok"
              ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
              : "bg-[var(--color-error-bg)] text-[var(--color-error-text)]"
          }`}
        >
          {message.text}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-[var(--color-secondary)]" role="alert">
          {error}
        </p>
      )}

      {reserveError && reserveError.code === "NO_ACTIVE_PLAN" && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          role="alert"
        >
          <p className="text-[var(--color-text)] mb-3">{reserveError.message}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/planes"
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
            >
              Ver planes
            </Link>
            {showTrialCta && (
              <button
                type="button"
                onClick={() => {
                  setReserveError(null);
                  setMainTab("calendario");
                }}
                className="inline-flex items-center justify-center rounded-[var(--radius-md)] border-2 border-[var(--color-primary)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] cursor-pointer"
              >
                Reservar clase de prueba gratis
              </button>
            )}
            <button
              type="button"
              onClick={() => setReserveError(null)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]/50 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {planSelectionFor && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          role="dialog"
          aria-labelledby="plan-selection-title"
        >
          <h2 id="plan-selection-title" className="font-medium text-[var(--color-text)] mb-2">
            Elegí con qué plan reservar
          </h2>
          <ul className="space-y-2 mb-4">
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
                  <span className="font-medium text-[var(--color-text)]">
                    {p.planName ?? "Plan"}
                  </span>
                  <span className="ml-2 text-[var(--color-text-muted)]">
                    {p.classesTotal != null
                      ? `${p.classesUsed}/${p.classesTotal} clases`
                      : "Ilimitado"}
                    {p.validUntil ? ` · Vence ${new Date(p.validUntil).toLocaleDateString("es-CL")}` : ""}
                  </span>
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
          <h2 id="plan-selection-student-title" className="font-medium text-[var(--color-text)] mb-2">
            Elegí con qué plan reservar para la alumna
          </h2>
          <ul className="space-y-2 mb-4">
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
                  <span className="font-medium text-[var(--color-text)]">
                    {p.planName ?? "Plan"}
                  </span>
                  <span className="ml-2 text-[var(--color-text-muted)]">
                    {p.classesTotal != null
                      ? `${p.classesUsed}/${p.classesTotal} clases`
                      : "Ilimitado"}
                    {p.validUntil ? ` · Vence ${new Date(p.validUntil).toLocaleDateString("es-CL")}` : ""}
                  </span>
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

      {showTrialCta && isStudent && !reserveError && (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]/30 p-3">
          <p className="text-sm text-[var(--color-text)]">
            Podés reservar una clase de prueba gratis.
          </p>
          <button
            type="button"
            onClick={() => setMainTab("calendario")}
            className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
          >
            Ver calendario de clases
          </button>
        </div>
      )}

      {isStudent ? (
        <TabsRoot
          value={mainTab}
          onChange={(v) => setMainTab(v)}
          aria-label="Clases y reservas"
        >
          <TabsList>
            <TabsTrigger value="reservas">Mis reservas</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>
          <TabsContent value="reservas" className="space-y-4">
            <TabsRoot defaultValue={TAB_HOY} aria-label="Tabs de reservas">
              <TabsList className="mb-2">
                <TabsTrigger value={TAB_HOY} id="tab-hoy">
                  Hoy
                </TabsTrigger>
                <TabsTrigger value={TAB_PROXIMAS} id="tab-proximas">
                  Próximas
                </TabsTrigger>
                <TabsTrigger value={TAB_CANCELADAS} id="tab-canceladas">
                  Canceladas
                </TabsTrigger>
                <TabsTrigger value={TAB_HISTORICAS} id="tab-historicas">
                  Históricas
                </TabsTrigger>
              </TabsList>
              <TabsContent value={TAB_HOY} className="pt-2">
                <ReservationsList
                  reservations={segmentedReservations.hoy}
                  compact
                  canCancelIds={canCancelIds}
                  onCancel={handleCancel}
                  cancelLoadingId={actionLoading}
                  emptyMessage="No tenés reservas para hoy."
                />
              </TabsContent>
              <TabsContent value={TAB_PROXIMAS} className="pt-2">
                <ReservationsList
                  reservations={segmentedReservations.proximas}
                  compact
                  canCancelIds={canCancelIds}
                  onCancel={handleCancel}
                  cancelLoadingId={actionLoading}
                  emptyMessage="No tenés próximas reservas."
                />
              </TabsContent>
              <TabsContent value={TAB_CANCELADAS} className="pt-2">
                <ReservationsList
                  reservations={segmentedReservations.canceladas}
                  compact
                  showCancelBadge
                  emptyMessage="No tenés reservas canceladas."
                />
              </TabsContent>
              <TabsContent value={TAB_HISTORICAS} className="pt-2">
                <ReservationsList
                  reservations={segmentedReservations.historicas}
                  compact
                  emptyMessage="No tenés historial de reservas."
                />
              </TabsContent>
            </TabsRoot>
          </TabsContent>
          <TabsContent value="calendario">
            <WeekNav
              weekAnchor={weekAnchor}
              weekStartDay={weekStartDay}
              onWeekChange={onWeekChange}
              allowPastWeeks={true}
              className="mb-4"
            />
            <WeekDaySelector
              weekAnchor={weekAnchor}
              weekStartDay={weekStartDay}
              selectedDate={effectiveSelectedDay}
              onSelectDay={setSelectedDay}
              classCountByDay={classCountByDay}
              className="mb-4"
            />
            {classesForSelectedDay.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No hay clases este día.
                </p>
              </div>
            ) : (
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
            )}
          </TabsContent>
        </TabsRoot>
      ) : (
        <div className="space-y-4">
          <WeekNav
            weekAnchor={weekAnchor}
            weekStartDay={weekStartDay}
            onWeekChange={onWeekChange}
            allowPastWeeks={true}
            className="mb-4"
          />
          <WeekDaySelector
            weekAnchor={weekAnchor}
            weekStartDay={weekStartDay}
            selectedDate={effectiveSelectedDay}
            onSelectDay={setSelectedDay}
            classCountByDay={classCountByDay}
            className="mb-4"
          />
          {classesForSelectedDay.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <p className="text-sm text-[var(--color-text-muted)]">
                No hay clases este día.
              </p>
            </div>
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
                    isAdmin={role === "ADMINISTRATOR"}
                    onCancelReservation={role === "ADMINISTRATOR" ? handleCancelReservationForUser : undefined}
                    cancelReservationLoadingId={cancelReservationLoadingId}
                    onReserveForStudent={role === "ADMINISTRATOR" ? openReserveForStudentModal : undefined}
                    reserveForStudentLoading={reserveForStudentLoading}
                    studentsForPicker={role === "ADMINISTRATOR" ? students : undefined}
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
      )}
    </div>
  );
}
