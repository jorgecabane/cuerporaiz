"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { syncWeeklyDaysOnStartDateChange } from "@/lib/application/series-edit";

export interface RecurrenceValue {
  repeat: "none" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatOnDays: number[];
  repeatEveryN: number;
  repeatEnd: "never" | "date" | "count";
  repeatEndDate: string | null;
  repeatEndCount: number | null;
  monthlyMode: "dayOfMonth" | "weekdayOrdinal" | null;
}

type RecurrencePreset =
  | "none"
  | "daily"
  | "weekly"
  | "monthly-ordinal"
  | "weekdays"
  | "custom";

const DAY_LABELS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "día(s)",
  WEEKLY: "semana(s)",
  MONTHLY: "mes(es)",
};

function getDayName(date: Date, tz: string): string {
  return date.toLocaleDateString("es-CL", { timeZone: tz, weekday: "long" });
}

function getWeekdayOrdinal(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

function getMonthlyOrdinalLabel(date: Date, tz: string): string {
  const ordinals = ["primer", "segundo", "tercer", "cuarto", "quinto"];
  const weekNum = getWeekdayOrdinal(date);
  return `${ordinals[weekNum - 1]} ${getDayName(date, tz)}`;
}

interface Props {
  selectedDate: Date | null;
  tz: string;
  onChange: (value: RecurrenceValue) => void;
  /** Permite la opción "No se repite" (creación). En edición de serie, false. */
  allowNone?: boolean;
  /** Valor inicial (edición): se abre como "Personalizar" con estos valores. */
  initial?: RecurrenceValue;
}

export function RecurrenceField({ selectedDate, tz, onChange, allowNone = true, initial }: Props) {
  const hasInitial = !!initial && initial.repeat !== "none";
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>(
    hasInitial ? "custom" : "none",
  );
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">(
    initial && initial.repeat !== "none" ? initial.repeat : "WEEKLY",
  );
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set(initial?.repeatOnDays ?? []),
  );
  const [repeatEveryN, setRepeatEveryN] = useState(initial?.repeatEveryN ?? 1);
  const [repeatEnd, setRepeatEnd] = useState<"never" | "date" | "count">(
    initial?.repeatEnd ?? "never",
  );
  const [repeatEndDate, setRepeatEndDate] = useState(initial?.repeatEndDate ?? "");
  const [repeatEndCount, setRepeatEndCount] = useState(initial?.repeatEndCount ?? 13);
  const [monthlyMode, setMonthlyMode] = useState<"dayOfMonth" | "weekdayOrdinal">(
    initial?.monthlyMode ?? "dayOfMonth",
  );

  const recurrenceOptions = useMemo(() => {
    const opts: { value: RecurrencePreset; label: string }[] = [];
    if (allowNone) opts.push({ value: "none", label: "No se repite" });
    opts.push({ value: "daily", label: "Cada día" });
    if (selectedDate) {
      opts.push({ value: "weekly", label: `Cada semana el ${getDayName(selectedDate, tz)}` });
      opts.push({
        value: "monthly-ordinal",
        label: `Cada mes el ${getMonthlyOrdinalLabel(selectedDate, tz)}`,
      });
    } else {
      opts.push({ value: "weekly", label: "Cada semana" });
      opts.push({ value: "monthly-ordinal", label: "Cada mes" });
    }
    opts.push({ value: "weekdays", label: "Todos los días laborables (lun a vie)" });
    opts.push({ value: "custom", label: "Personalizar…" });
    return opts;
  }, [selectedDate, tz, allowNone]);

  function getRepeatValue(): RecurrenceValue["repeat"] {
    switch (recurrencePreset) {
      case "none":
        return "none";
      case "daily":
        return "DAILY";
      case "weekly":
        return "WEEKLY";
      case "monthly-ordinal":
        return "MONTHLY";
      case "weekdays":
        return "WEEKLY";
      case "custom":
        return repeatFrequency;
    }
  }

  function getRepeatOnDays(): number[] {
    if (getRepeatValue() !== "WEEKLY") return [];
    switch (recurrencePreset) {
      case "weekly":
        return selectedDate ? [selectedDate.getDay()] : [];
      case "weekdays":
        return [1, 2, 3, 4, 5];
      case "custom":
        return [...selectedDays].sort((a, b) => a - b);
      default:
        return [];
    }
  }

  function getMonthlyMode(): "dayOfMonth" | "weekdayOrdinal" | null {
    if (getRepeatValue() !== "MONTHLY") return null;
    if (recurrencePreset === "monthly-ordinal") return "weekdayOrdinal";
    return monthlyMode;
  }

  function getRecurrenceLabel(): string {
    if (recurrencePreset !== "custom") {
      return recurrenceOptions.find((o) => o.value === recurrencePreset)?.label ?? "No se repite";
    }
    const freq = FREQUENCY_LABELS[repeatFrequency] ?? "";
    const everyLabel =
      repeatEveryN > 1 ? `Cada ${repeatEveryN} ${freq}` : `Cada ${freq.replace("(s)", "")}`;
    const daysLabel =
      repeatFrequency === "WEEKLY" && selectedDays.size > 0
        ? ` el ${DAY_LABELS.filter((d) => selectedDays.has(d.value)).map((d) => d.label).join(", ")}`
        : "";
    return `${everyLabel}${daysLabel}`;
  }

  function toggleDay(d: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function handlePresetChange(preset: RecurrencePreset) {
    setRecurrencePreset(preset);
    if (preset === "custom") {
      setCustomDialogOpen(true);
      if (recurrencePreset === "none" || recurrencePreset === "daily") {
        setRepeatFrequency("WEEKLY");
      }
    }
  }

  // WEEKLY: al mover la fecha de inicio, sincroniza los días marcados (mueve si
  // es de un día, agrega si es multi-día). Sólo con días explícitos (custom).
  const prevDowRef = useRef<number | null>(selectedDate ? selectedDate.getDay() : null);
  useEffect(() => {
    const newDow = selectedDate ? selectedDate.getDay() : null;
    const prevDow = prevDowRef.current;
    prevDowRef.current = newDow;
    if (newDow == null || prevDow == null || newDow === prevDow) return;
    if (repeatFrequency !== "WEEKLY" || recurrencePreset !== "custom") return;
    setSelectedDays(
      (prev) => new Set(syncWeeklyDaysOnStartDateChange([...prev], prevDow, newDow)),
    );
  }, [selectedDate, repeatFrequency, recurrencePreset]);

  // Emite el valor resuelto al padre cuando cambia cualquier parte.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const repeat = getRepeatValue();
    const everyN = recurrencePreset === "custom" ? repeatEveryN : 1;
    onChangeRef.current({
      repeat,
      repeatOnDays: getRepeatOnDays(),
      repeatEveryN: repeat !== "none" ? everyN : 1,
      repeatEnd: repeat !== "none" ? repeatEnd : "never",
      repeatEndDate: repeatEnd === "date" ? repeatEndDate || null : null,
      repeatEndCount: repeatEnd === "count" ? repeatEndCount : null,
      monthlyMode: getMonthlyMode(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recurrencePreset,
    repeatFrequency,
    selectedDays,
    repeatEveryN,
    repeatEnd,
    repeatEndDate,
    repeatEndCount,
    monthlyMode,
    selectedDate,
  ]);

  return (
    <>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4 space-y-3">
        <label htmlFor="recurrence" className="block text-sm font-medium text-[var(--color-text)]">
          Repetición
        </label>
        <select
          id="recurrence"
          value={recurrencePreset}
          onChange={(e) => handlePresetChange(e.target.value as RecurrencePreset)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          {recurrenceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {recurrencePreset === "custom" && !customDialogOpen && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {getRecurrenceLabel()}
            {" · "}
            <button
              type="button"
              onClick={() => setCustomDialogOpen(true)}
              className="underline hover:text-[var(--color-primary)]"
            >
              Editar
            </button>
          </p>
        )}
      </div>

      {customDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setCustomDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--color-text)]">Periodicidad personalizada</h3>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text)]">Repetir cada</span>
              <input
                type="number"
                min={1}
                value={repeatEveryN}
                onChange={(e) => setRepeatEveryN(Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-center"
              />
              <select
                value={repeatFrequency}
                onChange={(e) => setRepeatFrequency(e.target.value as "DAILY" | "WEEKLY" | "MONTHLY")}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
              >
                <option value="DAILY">día</option>
                <option value="WEEKLY">semana</option>
                <option value="MONTHLY">mes</option>
              </select>
            </div>

            {repeatFrequency === "WEEKLY" && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">Se repite el</p>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`h-9 w-9 rounded-full text-sm font-medium ${
                        selectedDays.has(d.value)
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {repeatFrequency === "MONTHLY" && selectedDate && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-text-muted)]">Se repite</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={monthlyMode === "dayOfMonth"}
                    onChange={() => setMonthlyMode("dayOfMonth")}
                    className="rounded-full"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    Cada mes el día {selectedDate.getDate()}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={monthlyMode === "weekdayOrdinal"}
                    onChange={() => setMonthlyMode("weekdayOrdinal")}
                    className="rounded-full"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    Cada mes el {getMonthlyOrdinalLabel(selectedDate, tz)}
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-muted)]">Termina</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={repeatEnd === "never"}
                  onChange={() => setRepeatEnd("never")}
                  className="rounded-full"
                />
                <span className="text-sm text-[var(--color-text)]">Nunca</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={repeatEnd === "date"}
                  onChange={() => setRepeatEnd("date")}
                  className="rounded-full"
                />
                <span className="text-sm text-[var(--color-text)]">El</span>
                <input
                  type="date"
                  value={repeatEndDate}
                  onChange={(e) => setRepeatEndDate(e.target.value)}
                  disabled={repeatEnd !== "date"}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm disabled:opacity-40"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={repeatEnd === "count"}
                  onChange={() => setRepeatEnd("count")}
                  className="rounded-full"
                />
                <span className="text-sm text-[var(--color-text)]">Después de</span>
                <input
                  type="number"
                  min={1}
                  value={repeatEndCount}
                  onChange={(e) => setRepeatEndCount(Math.max(1, Number(e.target.value)))}
                  disabled={repeatEnd !== "count"}
                  className="w-16 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-center disabled:opacity-40"
                />
                <span className="text-sm text-[var(--color-text-muted)]">repeticiones</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setCustomDialogOpen(false)}
                className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Hecho
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
