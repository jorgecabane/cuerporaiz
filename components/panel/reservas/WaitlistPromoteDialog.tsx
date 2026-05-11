"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Hourglass, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface WaitlistPromoteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  className: string;
  startsAt: string; // ISO
  durationMinutes: number;
  /** Si true, ya se intentó pero el cupo fue tomado por otra persona */
  spotTaken?: boolean;
}

function formatRange(startIso: string, durationMinutes: number): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const date = start.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = `${start.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
  return `${date}, ${time}`;
}

export function WaitlistPromoteDialog({
  open,
  onClose,
  onConfirm,
  loading,
  className,
  startsAt,
  durationMinutes,
  spotTaken = false,
}: WaitlistPromoteDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-promote-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/30 hover:text-[var(--color-text)] cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        {spotTaken ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-error-bg)] p-2">
                <Hourglass className="h-5 w-5 text-[var(--color-error)]" aria-hidden />
              </span>
              <h2
                id="wl-promote-title"
                className="text-lg font-semibold text-[var(--color-text)]"
              >
                El cupo ya fue tomado
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Otra persona de la lista de espera fue más rápida y reservó
              primero. Si vuelve a liberarse, te avisaremos por correo.
            </p>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="primary" onClick={onClose}>
                Entendido
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-primary-light)] p-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--color-primary)]" aria-hidden />
              </span>
              <h2
                id="wl-promote-title"
                className="text-lg font-semibold text-[var(--color-text)]"
              >
                ¡Se liberó tu cupo!
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Confirma para asegurar tu lugar antes de que otra persona de la
              lista de espera lo tome.
            </p>
            <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-tertiary)] p-4">
              <p className="font-medium text-[var(--color-text)]">{className}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {formatRange(startsAt, durationMinutes)}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Ahora no
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Confirmando…" : "Confirmar mi reserva"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
