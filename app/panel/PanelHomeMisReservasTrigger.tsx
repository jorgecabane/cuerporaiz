"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { MisReservasSheet } from "@/components/panel/reservas";

export interface PanelHomeMisReservasTriggerProps {
  cancelBeforeMinutes: number;
  cancelPolicyCopy?: string;
}

/**
 * Trigger + sheet "Mis reservas" para el home del panel (rol Estudiante).
 * Se renderiza como ítem de acción rápida con el mismo estilo que los links.
 */
export function PanelHomeMisReservasTrigger({
  cancelBeforeMinutes,
  cancelPolicyCopy,
}: PanelHomeMisReservasTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-sm)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
      >
        <Calendar className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
        <span className="text-sm font-medium text-[var(--color-text)]">Reservas</span>
      </button>
      <MisReservasSheet
        open={open}
        onOpenChange={setOpen}
        cancelBeforeMinutes={cancelBeforeMinutes}
        cancelPolicyCopy={cancelPolicyCopy}
      />
    </>
  );
}
