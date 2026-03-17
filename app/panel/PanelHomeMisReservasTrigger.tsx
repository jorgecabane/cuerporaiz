"use client";

import { useState } from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { MisReservasSheet } from "@/components/panel/reservas";

export interface PanelHomeMisReservasTriggerProps {
  cancelBeforeHours: number;
  cancelPolicyCopy?: string;
}

/**
 * Trigger + sheet "Mis reservas" para el home del panel (rol Estudiante).
 * Se renderiza como ítem de acción rápida con el mismo estilo que los links.
 */
export function PanelHomeMisReservasTrigger({
  cancelBeforeHours,
  cancelPolicyCopy,
}: PanelHomeMisReservasTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[3.5rem] w-full cursor-pointer items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 py-5 text-left shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 sm:min-h-0 sm:py-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <Calendar className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-[var(--color-text)]">
            Mis reservas
          </span>
          <span className="text-sm text-[var(--color-text-muted)]">
            Ver y cancelar tus reservas
          </span>
        </span>
        <ArrowRight
          className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]"
          aria-hidden
        />
      </button>
      <MisReservasSheet
        open={open}
        onOpenChange={setOpen}
        cancelBeforeHours={cancelBeforeHours}
        cancelPolicyCopy={cancelPolicyCopy}
      />
    </>
  );
}
