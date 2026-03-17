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

export interface ReservationsListProps {
  reservations: ReservationDto[];
  onCancel?: (reservationId: string) => void;
  cancelLoadingId?: string | null;
  emptyMessage?: string;
}

export function ReservationsList({
  reservations,
  onCancel,
  cancelLoadingId,
  emptyMessage = "No hay reservas.",
}: ReservationsListProps) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reservations.map((r) => (
        <li
          key={r.id}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
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
            {r.status === "CONFIRMED" && onCancel && (
              <Button
                type="button"
                variant="secondary"
                disabled={cancelLoadingId !== null}
                onClick={() => onCancel(r.id)}
              >
                {cancelLoadingId === r.id ? "Cancelando…" : "Cancelar reserva"}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
