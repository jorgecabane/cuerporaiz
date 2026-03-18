"use client";

import { useTransition, useState, useMemo, useRef } from "react";
import { createLiveClass, createMeetingForClass } from "../actions";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Discipline } from "@/lib/domain";
import type { Instructor } from "@/lib/ports/instructor-repository";

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

function nowLocalISO(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
}

function getDayName(date: Date): string {
  return date.toLocaleDateString("es-CL", { weekday: "long" });
}

function getWeekdayOrdinal(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

function getMonthlyOrdinalLabel(date: Date): string {
  const ordinals = ["primer", "segundo", "tercer", "cuarto", "quinto"];
  const weekNum = getWeekdayOrdinal(date);
  const dayName = getDayName(date);
  return `${ordinals[weekNum - 1]} ${dayName}`;
}

type RecurrencePreset = "none" | "daily" | "weekly" | "monthly-ordinal" | "weekdays" | "custom";

interface Props {
  disciplines: Discipline[];
  instructors: Instructor[];
  defaultDate?: string;
  defaultHour?: string;
  defaultDuration?: number;
  videoProviders?: { zoom: boolean; meet: boolean };
}

export function CreateClassForm({ disciplines, instructors, defaultDate, defaultHour, defaultDuration = 60, videoProviders = { zoom: false, meet: false } }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasVideoProvider = videoProviders.zoom || videoProviders.meet;
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<"zoom" | "meet" | null>(null);
  const [meetingFailCount, setMeetingFailCount] = useState(0);
  const [manualMeetingUrl, setManualMeetingUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Recurrence state
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>("none");
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [repeatEveryN, setRepeatEveryN] = useState(1);
  const [repeatEnd, setRepeatEnd] = useState<"never" | "date" | "count">("never");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [repeatEndCount, setRepeatEndCount] = useState(13);
  const [monthlyMode, setMonthlyMode] = useState<"dayOfMonth" | "weekdayOrdinal">("dayOfMonth");
  const [startsAtValue, setStartsAtValue] = useState(
    defaultDate && defaultHour ? `${defaultDate}T${String(defaultHour).padStart(2, "0")}:00` : ""
  );

  // Toggles
  const [isTrialClass, setIsTrialClass] = useState(false);

  // Color: inherits from discipline by default
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
  const [colorOverride, setColorOverride] = useState<string | null>(null);

  const disciplineColor = useMemo(() => {
    if (!selectedDisciplineId) return null;
    return disciplines.find((d) => d.id === selectedDisciplineId)?.color ?? null;
  }, [selectedDisciplineId, disciplines]);

  const effectiveColor = colorOverride ?? disciplineColor;

  const minDateTime = nowLocalISO();

  const selectedDate = useMemo(() => {
    if (!startsAtValue) return null;
    return new Date(startsAtValue);
  }, [startsAtValue]);

  const recurrenceOptions = useMemo(() => {
    const opts: { value: RecurrencePreset; label: string }[] = [
      { value: "none", label: "No se repite" },
      { value: "daily", label: "Cada día" },
    ];
    if (selectedDate) {
      const dayName = getDayName(selectedDate);
      opts.push({ value: "weekly", label: `Cada semana el ${dayName}` });
      const ordLabel = getMonthlyOrdinalLabel(selectedDate);
      opts.push({ value: "monthly-ordinal", label: `Cada mes el ${ordLabel}` });
    } else {
      opts.push({ value: "weekly", label: "Cada semana" });
      opts.push({ value: "monthly-ordinal", label: "Cada mes" });
    }
    opts.push({ value: "weekdays", label: "Todos los días laborables (lun a vie)" });
    opts.push({ value: "custom", label: "Personalizar…" });
    return opts;
  }, [selectedDate]);

  function getRecurrenceLabel(): string {
    if (recurrencePreset !== "custom") {
      return recurrenceOptions.find((o) => o.value === recurrencePreset)?.label ?? "No se repite";
    }
    const freq = FREQUENCY_LABELS[repeatFrequency] ?? "";
    const everyLabel = repeatEveryN > 1 ? `Cada ${repeatEveryN} ${freq}` : `Cada ${freq.replace("(s)", "")}`;
    const daysLabel = repeatFrequency === "WEEKLY" && selectedDays.size > 0
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

  function handleCustomDone() {
    setRecurrencePreset("custom");
    setCustomDialogOpen(false);
  }

  function handlePresetChange(preset: RecurrencePreset) {
    setRecurrencePreset(preset);
    if (preset === "custom") {
      setCustomDialogOpen(true);
      if (recurrencePreset === "none") {
        setRepeatFrequency("WEEKLY");
        setRepeatEveryN(1);
        setSelectedDays(new Set());
        setRepeatEnd("never");
      }
    }
  }

  function getRepeatValue(): "none" | "DAILY" | "WEEKLY" | "MONTHLY" {
    switch (recurrencePreset) {
      case "none": return "none";
      case "daily": return "DAILY";
      case "weekly": return "WEEKLY";
      case "monthly-ordinal": return "MONTHLY";
      case "weekdays": return "WEEKLY";
      case "custom": return repeatFrequency;
    }
  }

  function getRepeatOnDays(startsAt: Date): number[] {
    const repeat = getRepeatValue();
    if (repeat !== "WEEKLY") return [];
    switch (recurrencePreset) {
      case "weekly": return [startsAt.getDay()];
      case "weekdays": return [1, 2, 3, 4, 5];
      case "custom": return Array.from(selectedDays);
      default: return [];
    }
  }

  function getMonthlyMode(): "dayOfMonth" | "weekdayOrdinal" | null {
    const repeat = getRepeatValue();
    if (repeat !== "MONTHLY") return null;
    if (recurrencePreset === "monthly-ordinal") return "weekdayOrdinal";
    return monthlyMode;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMeetingError(null);
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim();
    const startsAt = fd.get("startsAt") as string;
    const durationMinutes = Number(fd.get("durationMinutes")) || defaultDuration;
    const maxCapacity = Number(fd.get("maxCapacity")) || 20;
    const disciplineId = (fd.get("disciplineId") as string) || null;
    const instructorId = (fd.get("instructorId") as string) || null;
    const trialCapacity = isTrialClass ? Number(fd.get("trialCapacity")) || 2 : null;

    if (!title || !startsAt) return;

    if (new Date(startsAt) <= new Date()) {
      setError("No se pueden agendar clases en el pasado.");
      return;
    }

    const meetingUrlToUse: string | null = manualMeetingUrl?.trim() || meetingUrl || null;
    if (isOnline && hasVideoProvider && !meetingUrlToUse) {
      setMeetingError("Generá el link con el botón de abajo o pegá uno manualmente.");
      return;
    }

    const repeat = getRepeatValue();
    const startsAtDate = new Date(startsAt);
    const repeatOnDays = getRepeatOnDays(startsAtDate);
    const effectiveEveryN = recurrencePreset === "custom" ? repeatEveryN : 1;

    startTransition(() =>
      createLiveClass({
        title,
        disciplineId,
        instructorId,
        startsAt,
        durationMinutes,
        maxCapacity,
        isOnline: !!meetingUrlToUse,
        meetingUrl: meetingUrlToUse,
        isTrialClass,
        trialCapacity,
        color: effectiveColor,
        repeat,
        repeatOnDays,
        repeatEveryN: repeat !== "none" ? effectiveEveryN : 1,
        repeatEnd: repeat !== "none" ? repeatEnd : "never",
        repeatEndDate: repeatEnd === "date" ? repeatEndDate : null,
        repeatEndCount: repeatEnd === "count" ? repeatEndCount : null,
        monthlyMode: getMonthlyMode(),
      })
    );
  }

  async function handleGenerateMeeting(provider: "zoom" | "meet") {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const title = (fd.get("title") as string)?.trim();
    const startsAt = fd.get("startsAt") as string;
    const durationMinutes = Number(fd.get("durationMinutes")) || defaultDuration;
    if (!title || !startsAt) {
      setMeetingError("Completá nombre y fecha/hora para generar el link.");
      return;
    }
    setMeetingError(null);
    setMeetingLoading(true);
    try {
      const res = await createMeetingForClass(provider, { title, startTime: startsAt, durationMinutes });
      setMeetingUrl(res.joinUrl);
      setManualMeetingUrl("");
      setLastUsedProvider(provider);
      setMeetingFailCount(0);
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "No se pudo crear la reunión.");
      setMeetingFailCount((c) => c + 1);
    } finally {
      setMeetingLoading(false);
    }
  }

  async function handleRetryMeeting() {
    const provider = lastUsedProvider ?? (videoProviders.zoom ? "zoom" : "meet");
    await handleGenerateMeeting(provider);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Nombre de la clase
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="ej. Yoga Vinyasa"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>

      {/* Disciplina + Profesor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="disciplineId" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Disciplina
          </label>
          <select
            id="disciplineId"
            name="disciplineId"
            value={selectedDisciplineId}
            onChange={(e) => {
              setSelectedDisciplineId(e.target.value);
              setColorOverride(null);
            }}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          >
            <option value="">Sin disciplina</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="instructorId" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Profesor
          </label>
          <select
            id="instructorId"
            name="instructorId"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          >
            <option value="">Sin asignar</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.userId}>{inst.name || inst.email}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fecha/hora + Duración */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="startsAt" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Fecha y hora inicio
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            min={minDateTime}
            value={startsAtValue}
            onChange={(e) => setStartsAtValue(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="durationMinutes" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Duración (min)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={15}
            defaultValue={defaultDuration}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
      </div>

      {/* Cupos */}
      <div>
        <label htmlFor="maxCapacity" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Cupos
        </label>
        <input
          id="maxCapacity"
          name="maxCapacity"
          type="number"
          min={1}
          defaultValue={20}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Color de la clase
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={effectiveColor || "#2D3B2A"}
            onChange={(e) => setColorOverride(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent p-0.5"
          />
          <span className="text-sm text-[var(--color-text-muted)]">
            {selectedDisciplineId ? "Heredado de la disciplina. Puedes cambiarlo." : "Color para el calendario."}
          </span>
        </div>
      </div>

      {/* Toggles: online + prueba */}
      <div className="flex flex-wrap gap-4">
        {hasVideoProvider ? (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => {
                setIsOnline(e.target.checked);
                if (!e.target.checked) {
                  setMeetingUrl(null);
                  setMeetingError(null);
                  setLastUsedProvider(null);
                  setMeetingFailCount(0);
                }
              }}
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text)]">Clase online</span>
          </label>
        ) : (
          <label className="inline-flex items-center gap-2 cursor-not-allowed opacity-50" title="Requiere configurar Zoom o Meet en Plugins">
            <input type="checkbox" disabled className="rounded border-[var(--color-border)]" />
            <span className="text-sm text-[var(--color-text)]">Clase online</span>
            <span className="text-xs text-[var(--color-text-muted)]">(requiere plugin)</span>
          </label>
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isTrialClass}
            onChange={(e) => setIsTrialClass(e.target.checked)}
            className="rounded border-[var(--color-border)]"
          />
          <span className="text-sm text-[var(--color-text)]">Acepta clase de prueba</span>
        </label>
      </div>

      {/* Generar link Zoom/Meet */}
      {isOnline && hasVideoProvider && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {videoProviders.zoom && (
              <button
                type="button"
                disabled={meetingLoading}
                onClick={() => handleGenerateMeeting("zoom")}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                {meetingLoading ? "Creando…" : "Generar link con Zoom"}
              </button>
            )}
            {videoProviders.meet && (
              <button
                type="button"
                disabled={meetingLoading}
                onClick={() => handleGenerateMeeting("meet")}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                {meetingLoading ? "Creando…" : "Generar link con Meet"}
              </button>
            )}
          </div>

          {meetingLoading && (
            <div className="space-y-2">
              <div className="h-4 w-24 rounded-[var(--radius-md)] bg-[var(--color-border)]/40 animate-pulse" aria-hidden />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!meetingLoading && meetingUrl && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Link de la reunión</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={meetingUrl}
                  className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(meetingUrl)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {meetingError && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-error-bg,#fef2f2)] p-3 text-sm text-[var(--color-error,#dc2626)]">
              {meetingError}
              <button type="button" onClick={handleRetryMeeting} className="ml-2 underline font-medium">Reintentar</button>
            </div>
          )}

          {meetingError && meetingFailCount >= 3 && (
            <div>
              <label htmlFor="manualMeetingUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Pegá el link de la reunión manualmente
              </label>
              <input
                id="manualMeetingUrl"
                type="url"
                value={manualMeetingUrl}
                onChange={(e) => setManualMeetingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              />
            </div>
          )}
        </div>
      )}

      {/* Trial capacity */}
      {isTrialClass && (
        <div>
          <label htmlFor="trialCapacity" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Cupos de prueba
          </label>
          <p className="text-xs text-[var(--color-text-muted)] mb-1">
            Cantidad de cupos reservados para clases de prueba (dentro del total).
          </p>
          <input
            id="trialCapacity"
            name="trialCapacity"
            type="number"
            min={1}
            defaultValue={2}
            className="w-32 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
      )}

      {/* Repetición */}
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
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {recurrencePreset === "custom" && !customDialogOpen && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {getRecurrenceLabel()}
            {" · "}
            <button type="button" onClick={() => setCustomDialogOpen(true)} className="underline hover:text-[var(--color-primary)]">
              Editar
            </button>
          </p>
        )}
      </div>

      {/* Custom recurrence dialog */}
      {customDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCustomDialogOpen(false)}>
          <div
            className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--color-text)]">Periodicidad personalizada</h3>

            {/* Frequency */}
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

            {/* Days of week (only for WEEKLY) */}
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

            {/* Monthly mode (only for MONTHLY) */}
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
                    Cada mes el {getMonthlyOrdinalLabel(selectedDate)}
                  </span>
                </label>
              </div>
            )}

            {/* End condition */}
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-muted)]">Termina</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={repeatEnd === "never"} onChange={() => setRepeatEnd("never")} className="rounded-full" />
                <span className="text-sm text-[var(--color-text)]">Nunca</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={repeatEnd === "date"} onChange={() => setRepeatEnd("date")} className="rounded-full" />
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
                <input type="radio" checked={repeatEnd === "count"} onChange={() => setRepeatEnd("count")} className="rounded-full" />
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

            {/* Actions */}
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
                onClick={handleCustomDone}
                className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Hecho
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Crear clase"}
        </button>
        <Button href="/panel/horarios" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
