"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Hourglass } from "lucide-react";
import type { ReservationDto } from "@/lib/dto/reservation-dto";
import type { WaitlistEntryDto } from "@/lib/dto/waitlist-dto";
import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
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
import { formatMinutesAsShortSpanish } from "@/lib/domain/center-policy";
import { ReservationListSkeleton } from "@/components/ui/PanelSkeletons";

const TAB_WAITLIST = "waitlist";

function willConsumeClassIfCancelNow(r: ReservationDto, cancelBeforeMinutes: number): boolean {
  const startsAt = r.liveClass?.startsAt;
  if (!startsAt) return true;
  const minutesBeforeClass = (new Date(startsAt).getTime() - Date.now()) / (1000 * 60);
  return minutesBeforeClass < cancelBeforeMinutes;
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
            : "Puedes cancelar sin perder tu clase. Se liberará tu cupo."}
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
  /** Minutos antes de la clase para cancelar sin consumir (config del centro). */
  cancelBeforeMinutes: number;
  /** Microcopy opcional: "Cancelación sin cargo hasta X h antes" */
  cancelPolicyCopy?: string;
}

export function MisReservasSheet({
  open,
  onOpenChange,
  cancelBeforeMinutes,
  cancelPolicyCopy,
}: MisReservasSheetProps) {
  const [items, setItems] = useState<ReservationDto[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<ReservationDto | null>(null);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);
  const [leaveWaitlistLoadingId, setLeaveWaitlistLoadingId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const [resReservations, resWaitlist] = await Promise.all([
        fetch("/api/reservations?page=1&pageSize=50"),
        fetch("/api/waitlist/mine"),
      ]);
      const reservationsData = resReservations.ok ? await resReservations.json() : { items: [] };
      const waitlistData = resWaitlist.ok ? await resWaitlist.json() : { entries: [] };
      setItems(reservationsData.items ?? []);
      setWaitlist(waitlistData.entries ?? []);
    } catch {
      setItems([]);
      setWaitlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchReservations();
  }, [open, fetchReservations]);

  const handleLeaveWaitlist = useCallback(async (entryId: string) => {
    setLeaveWaitlistLoadingId(entryId);
    try {
      const res = await fetch(`/api/waitlist/${entryId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Error al salir de la lista de espera");
        return;
      }
      toast("Saliste de la lista de espera");
      await fetchReservations();
    } finally {
      setLeaveWaitlistLoadingId(null);
    }
  }, [fetchReservations]);

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
        toast.error(data?.message ?? "Error al cancelar");
        return;
      }
      const newStatus = data?.status;
      const wasLate = newStatus === "LATE_CANCELLED";
      toast(wasLate
        ? "Reserva cancelada. Se descontó 1 clase."
        : "Reserva cancelada correctamente."
      );
      setCancelModalOpen(false);
      setReservationToCancel(null);
      await fetchReservations();
    } catch {
      toast.error("Error al cancelar la reserva");
    } finally {
      setCancelLoadingId(null);
    }
  }, [reservationToCancel, fetchReservations]);

  const isLateCancel = reservationToCancel
    ? willConsumeClassIfCancelNow(reservationToCancel, cancelBeforeMinutes)
    : false;

  return (
    <>
      <AdaptiveSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Mis reservas"
        variant="auto"
      >
        <div className="px-4 py-5 pb-6">
          {cancelPolicyCopy && (
            <p className="mb-4 px-1 text-sm text-[var(--color-text-muted)] leading-relaxed">
              Recuerda que puedes cancelar con hasta {formatMinutesAsShortSpanish(cancelBeforeMinutes)} de anticipación sin que se consuma tu clase. Si cancelas más tarde, se descontará 1 clase de tu plan, pero se libera tu cupo para que otra persona pueda reservar.
            </p>
          )}
          {loading ? (
            <ReservationListSkeleton />
          ) : (
            <TabsRoot defaultValue={TAB_HOY} aria-label="Tabs de reservas">
              <TabsList className="mb-2">
                <TabsTrigger value={TAB_HOY} id="tab-hoy">
                  Hoy
                </TabsTrigger>
                <TabsTrigger value={TAB_PROXIMAS} id="tab-proximas">
                  Próximas
                </TabsTrigger>
                <TabsTrigger value={TAB_WAITLIST} id="tab-waitlist">
                  Lista de espera
                  {waitlist.length > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-medium text-[var(--color-text-inverse)]">
                      {waitlist.length}
                    </span>
                  )}
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
                  emptyMessage="No tienes reservas para hoy."
                />
              </TabsContent>
              <TabsContent value={TAB_PROXIMAS} className="pt-2">
                <ReservationsList
                  reservations={segmented.proximas}
                  compact
                  canCancelIds={canCancelIds}
                  onCancel={handleCancelClick}
                  cancelLoadingId={cancelLoadingId}
                  emptyMessage="No tienes próximas reservas."
                />
              </TabsContent>
              <TabsContent value={TAB_WAITLIST} className="pt-2">
                <WaitlistList
                  entries={waitlist}
                  onLeave={handleLeaveWaitlist}
                  leaveLoadingId={leaveWaitlistLoadingId}
                />
              </TabsContent>
              <TabsContent value={TAB_CANCELADAS} className="pt-2">
                <ReservationsList
                  reservations={segmented.canceladas}
                  compact
                  showCancelBadge
                  emptyMessage="No tienes reservas canceladas."
                />
              </TabsContent>
              <TabsContent value={TAB_HISTORICAS} className="pt-2">
                <ReservationsList
                  reservations={segmented.historicas}
                  compact
                  emptyMessage="No tienes historial de reservas."
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

function WaitlistList({
  entries,
  onLeave,
  leaveLoadingId,
}: {
  entries: WaitlistEntryDto[];
  onLeave: (entryId: string) => void;
  leaveLoadingId: string | null;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <Hourglass
          className="mx-auto mb-2 h-6 w-6 text-[var(--color-text-muted)]"
          aria-hidden
        />
        <p className="text-sm text-[var(--color-text-muted)]">
          No estás en ninguna lista de espera.
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Cuando una clase o evento esté lleno, podrás unirte y te avisaremos
          cuando se libere un cupo.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">
              {e.itemTitle ?? (e.kind === "class" ? "Clase" : "Evento")}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {e.itemStartsAt
                ? new Date(e.itemStartsAt).toLocaleString("es-CL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
              {" · "}
              <span className="inline-flex items-center gap-1 text-[var(--color-primary)]">
                <Hourglass className="h-3 w-3" aria-hidden />
                Posición #{e.position}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onLeave(e.id)}
            disabled={leaveLoadingId === e.id}
            className="shrink-0 text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline disabled:opacity-50 cursor-pointer"
          >
            {leaveLoadingId === e.id ? "Saliendo…" : "Salir"}
          </button>
        </li>
      ))}
    </ul>
  );
}
