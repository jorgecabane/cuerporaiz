"use client";

import type { PolicyTimeUnit } from "@/lib/domain/center-policy";
import {
  defaultPolicyDisplay,
  formatMinutesAsShortSpanish,
  minutesFromPolicyInput,
} from "@/lib/domain/center-policy";

const UNIT_OPTIONS: { value: PolicyTimeUnit; label: string }[] = [
  { value: "minutes", label: "Minutos" },
  { value: "hours", label: "Horas" },
  { value: "days", label: "Días" },
];

export interface PolicyAnticipationFieldsProps {
  /** Prefijo de los names del form: `${prefix}Value` y `${prefix}Unit` */
  namePrefix: string;
  /** Minutos guardados en el centro */
  initialMinutes: number | null | undefined;
  /** Máximo permitido en minutos (validación en servidor) */
  maxMinutes: number;
  label: string;
  description?: string;
}

/**
 * Valor numérico + selector minutos/horas/días; el action convierte a minutos con minutesFromPolicyInput.
 */
export function PolicyAnticipationFields({
  namePrefix,
  initialMinutes,
  maxMinutes,
  label,
  description,
}: PolicyAnticipationFieldsProps) {
  const { value, unit } = defaultPolicyDisplay(initialMinutes);
  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <div>
      <label
        htmlFor={`${namePrefix}-value`}
        className="block text-sm font-medium text-[var(--color-text)] mb-1"
      >
        {label}
      </label>
      {description && (
        <p className="text-xs text-[var(--color-text-muted)] mb-2">{description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`${namePrefix}-value`}
          name={`${namePrefix}Value`}
          type="number"
          min={0}
          step={1}
          defaultValue={safeValue}
          className="min-w-[5rem] flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)]"
          aria-describedby={description ? `${namePrefix}-hint` : undefined}
        />
        <select
          id={`${namePrefix}-unit`}
          name={`${namePrefix}Unit`}
          defaultValue={unit}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          {UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p id={`${namePrefix}-hint`} className="mt-1 text-xs text-[var(--color-text-muted)]">
        Máximo permitido: {formatMinutesAsShortSpanish(maxMinutes)}.
      </p>
    </div>
  );
}

/** Lee `${prefix}Value` y `${prefix}Unit` del FormData. */
export function parsePolicyMinutesFromForm(formData: FormData, prefix: string): number {
  const raw = formData.get(`${prefix}Value`);
  const unitRaw = formData.get(`${prefix}Unit`);
  const n = raw != null && raw !== "" ? Number(raw) : 0;
  const unit =
    unitRaw === "minutes" || unitRaw === "hours" || unitRaw === "days"
      ? unitRaw
      : "hours";
  return minutesFromPolicyInput(n, unit);
}
