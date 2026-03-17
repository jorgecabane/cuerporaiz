"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReservationDto } from "@/lib/dto/reservation-dto";
import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { Button } from "@/components/ui/Button";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "./Tabs";
import { ReservationsList } from "./ReservationsList";
import {
  TAB_HOY,
  TAB_PROXIMAS,
  TAB_CANCELADAS,
  TAB_HISTORICAS,
  segmentReservations,
  canCancelReservation,
} from "./segment-reservations";

function willConsumeClassIfCancelNow(r: ReservationDto, cancelBeforeHours: number): boolean {
  const startsAt = r.liveClass?.startsAt;
  if (!startsAt) return true;
  const hoursBeforeClass = (new Date(startsAt).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursBeforeClass < cancelBeforeHours;
}

/** Modal de confirmación: a tiempo vs tardía */
function CancelConfirmModal({
  open,
  onOpenChange,
  isLate,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLate: boolean;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]">
        <h2 id="cancel-modal-title" className="text-lg font-semibold text-[var(--color-text)]">
          {isLate ? "Cancelación tardía" : "¿Cancelar reserva?"}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {isLate
            ? "Se descontará 1 clase de tu plan. Se liberará tu cupo."
            : "Podés cancelar sin perder tu clase. Se liberará tu cupo."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            No, mantener
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Cancelando…" : isLate ? "Cancelar igual" : "Sí, cancelar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface MisReservasSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Horas antes de la clase para cancelar sin consumir (config del centro). */
  cancelBeforeHours: number;
  /** Microcopy opcional: "Cancelación sin cargo hasta X h antes" */
  cancelPolicyCopy?: string;
}

export function MisReservasSheet({
  open,
  onOpenChange,
  cancelBeforeHours,
  cancelPolicyCopy,
}: MisReservasSheetProps) {
  const [items, setItems] = useState<ReservationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<ReservationDto | null>(null);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations?page=1&pageSize=50");
      if (!res.ok) throw new Error("Error al cargar reservas");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchReservations();
  }, [open, fetchReservations]);

  const segmented = useMemo(() => segmentReservations(items), [items]);
  const canCancelIds = useMemo(
    () => new Set(items.filter(canCancelReservation).map((r) => r.id)),
    [items]
  );

  const handleCancelClick = useCallback((reservationId: string) => {
    const r = items.find((i) => i.id === reservationId);
    if (!r) return;
    setReservationToCancel(r);
    setCancelModalOpen(true);
  }, [items]);

  const handleConfirmCancel = useCallback(async () => {
    if (!reservationToCancel) return;
    setCancelLoadingId(reservationToCancel.id);
    try {
      const res = await fetch(`/api/reservations/${reservationToCancel.id}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data?.message ?? "Error al cancelar" });
        return;
      }
      const newStatus = data?.status;
      const wasLate = newStatus === "LATE_CANCELLED";
      setToast({
        message: wasLate
          ? "Reserva cancelada. Se descontó 1 clase."
          : "Reserva cancelada. No se descontó ninguna clase.",
      });
      setCancelModalOpen(false);
      setReservationToCancel(null);
      await fetchReservations();
    } catch {
      setToast({ message: "Error al cancelar la reserva" });
    } finally {
      setCancelLoadingId(null);
    }
  }, [reservationToCancel, fetchReservations]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const isLateCancel = reservationToCancel
    ? willConsumeClassIfCancelNow(reservationToCancel, cancelBeforeHours)
    : false;

  return (
    <>
      <AdaptiveSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Mis reservas"
        variant="auto"
      >
        <div className="px-4 pb-6">
          {cancelPolicyCopy && (
            <p className="mb-3 text-xs text-[var(--color-text-muted)]">
              {cancelPolicyCopy}
            </p>
          )}
          {toast && (
            <div
              className="mb-3 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] px-3 py-2 text-sm text-[var(--color-primary)]"
              role="status"
            >
              {toast.message}
            </div>
          )}
          {loading ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              Cargando reservas…
            </p>
          ) : (
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
                  reservations={segmented.hoy}
                  compact
                  canCancelIds={canCancelIds}
                  onCancel={handleCancelClick}
                  cancelLoadingId={cancelLoadingId}
                  emptyMessage="No tenés reservas para hoy."
                />
              </TabsContent>
              <TabsContent value={TAB_PROXIMAS} className="pt-2">
                <ReservationsList
                  reservations={segmented.proximas}
                  compact
                  canCancelIds={canCancelIds}
                  onCancel={handleCancelClick}
                  cancelLoadingId={cancelLoadingId}
                  emptyMessage="No tenés próximas reservas."
                />
              </TabsContent>
              <TabsContent value={TAB_CANCELADAS} className="pt-2">
                <ReservationsList
                  reservations={segmented.canceladas}
                  compact
                  showCancelBadge
                  emptyMessage="No tenés reservas canceladas."
                />
              </TabsContent>
              <TabsContent value={TAB_HISTORICAS} className="pt-2">
                <ReservationsList
                  reservations={segmented.historicas}
                  compact
                  emptyMessage="No tenés historial de reservas."
                />
              </TabsContent>
            </TabsRoot>
          )}
        </div>
      </AdaptiveSheet>

      <CancelConfirmModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        isLate={isLateCancel}
        onConfirm={handleConfirmCancel}
        loading={cancelLoadingId !== null}
      />
    </>
  );
}
