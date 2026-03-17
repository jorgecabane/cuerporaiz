"use client";

import { useTransition, useState } from "react";
import { updateCenterPolicies } from "./actions";
import type { Center } from "@/lib/domain";

type Props = { center: Center };

export function PoliticasForm({ center }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        const cancelBeforeHours = formData.get("cancelBeforeHours");
        const maxNoShowsPerMonth = formData.get("maxNoShowsPerMonth");
        const bookBeforeHours = formData.get("bookBeforeHours");
        const notifyWhenSlotFreed = formData.get("notifyWhenSlotFreed") === "on";
        const instructorCanReserveForStudent = formData.get("instructorCanReserveForStudent") === "on";
        const allowTrialClassPerPerson = formData.get("allowTrialClassPerPerson") === "on";

        startTransition(async () => {
          const result = await updateCenterPolicies(center.id, {
            cancelBeforeHours: cancelBeforeHours != null ? Number(cancelBeforeHours) : undefined,
            maxNoShowsPerMonth: maxNoShowsPerMonth != null ? Number(maxNoShowsPerMonth) : undefined,
            bookBeforeHours: bookBeforeHours != null ? Number(bookBeforeHours) : undefined,
            notifyWhenSlotFreed,
            instructorCanReserveForStudent,
            allowTrialClassPerPerson,
          });
          if (result.error) setError(result.error);
        });
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-1">
        <div>
          <label htmlFor="cancelBeforeHours" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Horas antes para cancelar (sin consumir clase)
          </label>
          <input
            id="cancelBeforeHours"
            name="cancelBeforeHours"
            type="number"
            min={0}
            max={168}
            defaultValue={center.cancelBeforeHours}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="bookBeforeHours" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Ventana para reservar (hasta cuántas horas antes del inicio se puede reservar)
          </label>
          <input
            id="bookBeforeHours"
            name="bookBeforeHours"
            type="number"
            min={0}
            max={720}
            defaultValue={center.bookBeforeHours}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="maxNoShowsPerMonth" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            No-shows máximos por mes (antes de advertencia/bloqueo)
          </label>
          <input
            id="maxNoShowsPerMonth"
            name="maxNoShowsPerMonth"
            type="number"
            min={0}
            max={31}
            defaultValue={center.maxNoShowsPerMonth}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="notifyWhenSlotFreed"
            name="notifyWhenSlotFreed"
            type="checkbox"
            defaultChecked={center.notifyWhenSlotFreed}
            className="rounded border-[var(--color-border)]"
          />
          <label htmlFor="notifyWhenSlotFreed" className="text-sm text-[var(--color-text)]">
            Avisar cuando se libere un cupo
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="instructorCanReserveForStudent"
            name="instructorCanReserveForStudent"
            type="checkbox"
            defaultChecked={center.instructorCanReserveForStudent}
            className="rounded border-[var(--color-border)]"
          />
          <label htmlFor="instructorCanReserveForStudent" className="text-sm text-[var(--color-text)]">
            La profesora puede reservar en nombre de una alumna
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="allowTrialClassPerPerson"
            name="allowTrialClassPerPerson"
            type="checkbox"
            defaultChecked={center.allowTrialClassPerPerson}
            className="rounded border-[var(--color-border)]"
          />
          <label htmlFor="allowTrialClassPerPerson" className="text-sm text-[var(--color-text)]">
            Permitir una clase de prueba por persona
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar políticas"}
      </button>
    </form>
  );
}
