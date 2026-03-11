"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LiveClassDto, ReservationDto } from "@/lib/dto/reservation-dto";
import { RESERVATION_STATUS_LABELS } from "@/lib/domain/reservation";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PanelReservasPage() {
  const [liveClasses, setLiveClasses] = useState<LiveClassDto[]>([]);
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function showMessage(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, reservsRes] = await Promise.all([
        fetch("/api/reservations/live-classes"),
        fetch("/api/reservations"),
      ]);
      if (!classesRes.ok || !reservsRes.ok) {
        setError("Error al cargar datos");
        return;
      }
      const [classesData, reservsData] = await Promise.all([
        classesRes.json(),
        reservsRes.json(),
      ]);
      setLiveClasses(Array.isArray(classesData) ? classesData : []);
      setReservations(Array.isArray(reservsData) ? reservsData : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReserve(liveClassId: string) {
    setActionLoading(liveClassId);
    setMessage(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage("err", data.message ?? "Error al reservar");
        return;
      }
      showMessage("ok", "Reserva confirmada");
      await load();
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
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) {
        showMessage("err", data.message ?? "Error al cancelar");
        return;
      }
      showMessage("ok", "Reserva cancelada");
      await load();
    } catch {
      showMessage("err", "Error de conexión");
    } finally {
      setActionLoading(null);
    }
  }

  const myConfirmedLiveClassIds = new Set(
    reservations.filter((r) => r.status === "CONFIRMED").map((r) => r.liveClassId)
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-[var(--color-text-muted)]">Cargando clases y reservas…</p>
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
              : "bg-red-100 text-red-800"
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

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Próximas clases</h2>
        {liveClasses.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm">No hay clases programadas.</p>
        ) : (
          <ul className="space-y-3">
            {liveClasses.map((c) => {
              const alreadyReserved = myConfirmedLiveClassIds.has(c.id);
              const noSpots = c.spotsLeft <= 0;
              const canReserve = !alreadyReserved && !noSpots;
              return (
                <li
                  key={c.id}
                  className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">{c.title}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(c.startsAt)} · {c.durationMinutes} min · {c.spotsLeft}/{c.maxCapacity} cupos
                      </p>
                    </div>
                    {canReserve && (
                      <button
                        type="button"
                        onClick={() => handleReserve(c.id)}
                        disabled={actionLoading !== null}
                        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
                      >
                        {actionLoading === c.id ? "Reservando…" : "Reservar"}
                      </button>
                    )}
                    {alreadyReserved && (
                      <span className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                        Ya reservaste
                      </span>
                    )}
                    {noSpots && !alreadyReserved && (
                      <span className="text-sm text-[var(--color-text-muted)]">Sin cupos</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Mis reservas</h2>
        {reservations.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm">Aún no tienes reservas.</p>
        ) : (
          <ul className="space-y-3">
            {reservations.map((r) => (
              <li
                key={r.id}
                className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {r.liveClass?.title ?? "Clase"}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {r.liveClass?.startsAt ? formatDate(r.liveClass.startsAt) : ""} ·{" "}
                      {RESERVATION_STATUS_LABELS[r.status as keyof typeof RESERVATION_STATUS_LABELS] ?? r.status}
                    </p>
                  </div>
                  {r.status === "CONFIRMED" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(r.id)}
                      disabled={actionLoading !== null}
                      className="rounded-[var(--radius-md)] border border-[var(--color-secondary)] px-3 py-2 text-sm font-medium text-[var(--color-secondary)] hover:bg-red-50 disabled:opacity-60"
                    >
                      {actionLoading === r.id ? "Cancelando…" : "Cancelar reserva"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
