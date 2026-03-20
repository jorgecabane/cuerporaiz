"use client";

import { useTransition, useState } from "react";
import { updateCenterPolicies } from "./actions";
import type { Center } from "@/lib/domain";
import {
  PolicyAnticipationFields,
  parsePolicyMinutesFromForm,
} from "@/components/panel/config/PolicyAnticipationFields";
import {
  MAX_BOOK_BEFORE_MINUTES,
  MAX_CANCEL_BEFORE_MINUTES,
} from "@/lib/domain/center-policy";

type Props = { center: Center };

export function PoliticasForm({ center }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        const cancelBeforeMinutes = parsePolicyMinutesFromForm(formData, "cancelBefore");
        const maxNoShowsPerMonth = formData.get("maxNoShowsPerMonth");
        const bookBeforeMinutes = parsePolicyMinutesFromForm(formData, "bookBefore");
        const notifyWhenSlotFreed = formData.get("notifyWhenSlotFreed") === "on";
        const instructorCanReserveForStudent = formData.get("instructorCanReserveForStudent") === "on";
        const allowTrialClassPerPerson = formData.get("allowTrialClassPerPerson") === "on";
        const calendarStartHour = formData.get("calendarStartHour");
        const calendarEndHour = formData.get("calendarEndHour");
        const defaultClassDurationMinutes = formData.get("defaultClassDurationMinutes");

        startTransition(async () => {
          const result = await updateCenterPolicies(center.id, {
            cancelBeforeMinutes,
            maxNoShowsPerMonth: maxNoShowsPerMonth != null ? Number(maxNoShowsPerMonth) : undefined,
            bookBeforeMinutes,
            notifyWhenSlotFreed,
            instructorCanReserveForStudent,
            allowTrialClassPerPerson,
            calendarStartHour: calendarStartHour != null ? Number(calendarStartHour) : undefined,
            calendarEndHour: calendarEndHour != null ? Number(calendarEndHour) : undefined,
            defaultClassDurationMinutes: defaultClassDurationMinutes != null ? Number(defaultClassDurationMinutes) : undefined,
          });
          if (result.error) setError(result.error);
        });
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-1">
        <PolicyAnticipationFields
          key={`cancel-${center.updatedAt.toISOString()}`}
          namePrefix="cancelBefore"
          initialMinutes={center.cancelBeforeMinutes}
          maxMinutes={MAX_CANCEL_BEFORE_MINUTES}
          label="Anticipación para cancelar sin consumir clase"
          description="El alumno puede cancelar sin que se descuente una clase si lo hace con al menos este tiempo antes del inicio."
        />
        <PolicyAnticipationFields
          key={`book-${center.updatedAt.toISOString()}`}
          namePrefix="bookBefore"
          initialMinutes={center.bookBeforeMinutes}
          maxMinutes={MAX_BOOK_BEFORE_MINUTES}
          label="Ventana mínima para reservar"
          description="Solo se puede reservar si quedan al menos este tiempo hasta el inicio de la clase (anticipación mínima)."
        />
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
            defaultValue={center.maxNoShowsPerMonth ?? 2}
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
            El profesor puede reservar en nombre de un estudiante
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

      {/* Preferencias del calendario */}
      <div className="border-t border-[var(--color-border)] pt-6 mt-6">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Preferencias del calendario</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="defaultClassDurationMinutes" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Duración por defecto de clases (minutos)
            </label>
            <input
              id="defaultClassDurationMinutes"
              name="defaultClassDurationMinutes"
              type="number"
              min={15}
              max={240}
              step={5}
              defaultValue={center.defaultClassDurationMinutes ?? 60}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
            />
          </div>
          <div>
            <label htmlFor="calendarStartHour" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Hora de inicio del calendario
            </label>
            <input
              id="calendarStartHour"
              name="calendarStartHour"
              type="number"
              min={0}
              max={12}
              defaultValue={center.calendarStartHour ?? 7}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
            />
          </div>
          <div>
            <label htmlFor="calendarEndHour" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Hora de fin del calendario
            </label>
            <input
              id="calendarEndHour"
              name="calendarEndHour"
              type="number"
              min={12}
              max={24}
              defaultValue={center.calendarEndHour ?? 22}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
