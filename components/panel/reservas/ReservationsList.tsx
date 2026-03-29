"use client";

import type { ReservationDto } from "@/lib/dto/reservation-dto";
import { RESERVATION_STATUS_LABELS } from "@/lib/domain/reservation";
import { Button } from "@/components/ui/Button";

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

/** Formato compacto: "dd/mm" y "HH:mm" por separado */
function formatCompact(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
    time: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
}

export interface ReservationsListProps {
  reservations: ReservationDto[];
  onCancel?: (reservationId: string) => void;
  cancelLoadingId?: string | null;
  emptyMessage?: string;
  /** Vista compacta: línea "Clase · HH:mm", subtexto "dd/mm · sala o profe" */
  compact?: boolean;
  /** En tab Canceladas: mostrar badge "A tiempo" (CANCELLED) vs "Tarde" (LATE_CANCELLED) */
  showCancelBadge?: boolean;
  /** Solo mostrar botón Cancelar si la reserva es cancelable (CONFIRMED y clase no iniciada). Si no se pasa, se muestra para toda CONFIRMED. */
  canCancelIds?: Set<string>;
}

export function ReservationsList({
  reservations,
  onCancel,
  cancelLoadingId,
  emptyMessage = "No hay reservas.",
  compact = false,
  showCancelBadge = false,
  canCancelIds,
}: ReservationsListProps) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 animate-fade-in">
        <p className="text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reservations.map((r) => {
        const showCancel =
          r.status === "CONFIRMED" &&
          onCancel &&
          (canCancelIds === undefined || canCancelIds.has(r.id));
        const cancelledLate = r.status === "LATE_CANCELLED";

        return (
          <li
            key={r.id}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {compact && r.liveClass?.startsAt ? (
                  <>
                    <p className="font-medium text-[var(--color-text)]">
                      {r.liveClass?.title ?? "Clase"} · {formatCompact(r.liveClass.startsAt).time}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {formatCompact(r.liveClass.startsAt).date} ·{" "}
                      {r.liveClass?.instructorName ?? "Presencial"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-[var(--color-text)]">
                      {r.liveClass?.title ?? "Clase"}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {r.liveClass?.startsAt ? formatDate(r.liveClass.startsAt) : ""} ·{" "}
                      {RESERVATION_STATUS_LABELS[r.status as keyof typeof RESERVATION_STATUS_LABELS] ?? r.status}
                    </p>
                  </>
                )}
                {showCancelBadge && (r.status === "CANCELLED" || r.status === "LATE_CANCELLED") && (
                  <span
                    className="mt-1.5 inline-block rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: cancelledLate ? "var(--color-secondary-light)" : "var(--color-primary-light)",
                      color: cancelledLate ? "var(--color-secondary)" : "var(--color-primary)",
                    }}
                  >
                    {cancelledLate ? "Tarde" : "A tiempo"}
                  </span>
                )}
              </div>
              {showCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={cancelLoadingId !== null}
                  onClick={() => onCancel(r.id)}
                >
                  {cancelLoadingId === r.id ? "Cancelando…" : "Cancelar"}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
