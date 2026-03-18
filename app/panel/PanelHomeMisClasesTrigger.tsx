"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { MisClasesSheet } from "@/components/panel/reservas";

/**
 * Trigger + sheet "Mis clases" para el home del panel (rol Profesor).
 * Misma forma de card que el resto de accesos.
 */
export function PanelHomeMisClasesTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-sm)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
      >
        <CalendarDays className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
        <span className="text-sm font-medium text-[var(--color-text)]">Mis clases</span>
      </button>
      <MisClasesSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
