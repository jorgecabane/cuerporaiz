"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Role } from "@/lib/domain/role";
import { isStudentRole } from "@/lib/domain";
import type { ReservationDto, UserPlanOptionDto } from "@/lib/dto/reservation-dto";
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  ReservationsList,
  segmentReservations,
  canCancelReservation,
  TAB_HOY,
  TAB_PROXIMAS,
  TAB_CANCELADAS,
  TAB_HISTORICAS,
} from "@/components/panel/reservas";

const RESERVATIONS_PAGE_SIZE = 50;

type PanelRole = Role;

interface ReservasPanelProps {
  role: PanelRole;
  centerId: string;
  weekStartDay?: number;
}

export function ReservasPanel({
  role,
  centerId,
  weekStartDay: _weekStartDay,
}: ReservasPanelProps) {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [reservationsTotal, setReservationsTotal] = useState(0);
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
  const [showTrialCta, setShowTrialCta] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadReservations();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [loadReservations]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isStudentRole(role)) {
      fetch("/api/reservations/can-show-trial-cta")
        .then((r) => (r.ok ? r.json() : {}))
        .then((data: { showTrialCta?: boolean }) => setShowTrialCta(Boolean(data.showTrialCta)))
        .catch(() => setShowTrialCta(false));
    }
  }, [role]);

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
            message: data.message ?? "Para reservar necesitas un plan activo.",
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
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading && reservations.length === 0) {
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
          ← Home
        </Link>
      </div>
      <h1 className="font-display text-section text-[var(--color-primary)] mb-6">
        Reservas
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
              <Link
                href="/panel"
                onClick={() => setReserveError(null)}
                className="inline-flex items-center justify-center rounded-[var(--radius-md)] border-2 border-[var(--color-primary)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] cursor-pointer"
              >
                Reservar clase de prueba gratis
              </Link>
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

      {showTrialCta && isStudentRole(role) && !reserveError && (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]/30 p-3">
          <p className="text-sm text-[var(--color-text)]">
            Puedes reservar una clase de prueba gratis.
          </p>
          <Link
            href="/panel"
            className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Ver calendario en Home
          </Link>
        </div>
      )}

      <div className="space-y-4">
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
              emptyMessage="No tienes reservas para hoy."
            />
          </TabsContent>
          <TabsContent value={TAB_PROXIMAS} className="pt-2">
            <ReservationsList
              reservations={segmentedReservations.proximas}
              compact
              canCancelIds={canCancelIds}
              onCancel={handleCancel}
              cancelLoadingId={actionLoading}
              emptyMessage="No tienes próximas reservas."
            />
          </TabsContent>
          <TabsContent value={TAB_CANCELADAS} className="pt-2">
            <ReservationsList
              reservations={segmentedReservations.canceladas}
              compact
              showCancelBadge
              emptyMessage="No tienes reservas canceladas."
            />
          </TabsContent>
          <TabsContent value={TAB_HISTORICAS} className="pt-2">
            <ReservationsList
              reservations={segmentedReservations.historicas}
              compact
              emptyMessage="No tienes historial de reservas."
            />
          </TabsContent>
        </TabsRoot>
      </div>
    </div>
  );
}
