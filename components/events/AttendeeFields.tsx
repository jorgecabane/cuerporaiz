"use client";

import { useId } from "react";
import type { EventAttendeeInput } from "@/lib/ports/event-attendee-repository";

type Props = {
  quantity: number;
  value: EventAttendeeInput[];
  onChange: (value: EventAttendeeInput[]) => void;
  disabled?: boolean;
  /** Error por fila (cupos 2…N), p.ej. de attendeeEmailErrors. */
  errors?: (string | null)[];
};

const INPUT =
  "min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]";

/** Filas opcionales de nombre/correo para los cupos 2…N de un evento online. */
export function AttendeeFields({ quantity, value, onChange, disabled, errors = [] }: Props) {
  const id = useId();
  if (quantity < 2) return null;

  const rows = Array.from({ length: quantity - 1 }, (_, i) => value[i] ?? { name: null, email: null });
  const update = (i: number, patch: Partial<EventAttendeeInput>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <fieldset className="flex flex-col gap-[var(--space-3)]">
      <legend className="text-sm font-medium text-[var(--color-text)]">Asistentes (opcional)</legend>
      <p className="text-xs text-[var(--color-text-muted)]">
        Si dejas su correo, le enviamos su link directo. Si no, te llegan todos a ti.
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">Entrada 1 · tú</p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name-${i}`} className="text-sm text-[var(--color-text)]">
              Entrada {i + 2} · nombre
            </label>
            <input
              id={`${id}-name-${i}`}
              type="text"
              autoComplete="off"
              disabled={disabled}
              value={r.name ?? ""}
              onChange={(e) => update(i, { name: e.target.value })}
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-email-${i}`} className="text-sm text-[var(--color-text)]">
              Entrada {i + 2} · correo
            </label>
            <input
              id={`${id}-email-${i}`}
              type="email"
              autoComplete="off"
              disabled={disabled}
              value={r.email ?? ""}
              onChange={(e) => update(i, { email: e.target.value })}
              aria-invalid={errors[i] ? true : undefined}
              aria-describedby={errors[i] ? `${id}-email-error-${i}` : undefined}
              className={INPUT}
            />
            {errors[i] && (
              <p id={`${id}-email-error-${i}`} role="alert" className="text-sm text-[var(--color-error)]">
                {errors[i]}
              </p>
            )}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
