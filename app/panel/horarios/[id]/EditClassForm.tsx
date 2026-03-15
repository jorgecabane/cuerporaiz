"use client";

import { useTransition, useState, useMemo } from "react";
import { updateLiveClass, cancelLiveClass, updateSeriesClasses } from "../actions";
import type { EditScope } from "../actions";
import { Button } from "@/components/ui/Button";
import type { LiveClass, Discipline, LiveClassSeries } from "@/lib/domain";
import type { Instructor } from "@/lib/ports/instructor-repository";

function toLocalISO(d: Date): string {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

interface Props {
  liveClass: LiveClass;
  disciplines: Discipline[];
  instructors: Instructor[];
  series: LiveClassSeries | null;
  reservationCount: number;
  defaultDuration: number;
}

export function EditClassForm({
  liveClass,
  disciplines,
  instructors,
  series,
  reservationCount,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editScope, setEditScope] = useState<EditScope>("this");

  const [isTrialClass, setIsTrialClass] = useState(liveClass.isTrialClass);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(
    liveClass.disciplineId ?? ""
  );
  const [colorOverride, setColorOverride] = useState<string | null>(
    liveClass.color
  );
  const [startsAtValue, setStartsAtValue] = useState(
    toLocalISO(new Date(liveClass.startsAt))
  );

  const disciplineColor = useMemo(() => {
    if (!selectedDisciplineId) return null;
    return disciplines.find((d) => d.id === selectedDisciplineId)?.color ?? null;
  }, [selectedDisciplineId, disciplines]);

  const effectiveColor = colorOverride ?? disciplineColor;

  const isPast = new Date(liveClass.startsAt) < new Date();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim();
    const startsAt = fd.get("startsAt") as string;
    const durationMinutes = Number(fd.get("durationMinutes")) || 60;
    const maxCapacity = Number(fd.get("maxCapacity")) || 20;
    const disciplineId = (fd.get("disciplineId") as string) || null;
    const instructorId = (fd.get("instructorId") as string) || null;
    const trialCapacity = isTrialClass
      ? Number(fd.get("trialCapacity")) || 2
      : null;

    if (!title || !startsAt) return;

    const formPayload = {
      id: liveClass.id,
      title,
      disciplineId,
      instructorId,
      startsAt,
      durationMinutes,
      maxCapacity,
      isOnline: false,
      isTrialClass,
      trialCapacity,
      color: effectiveColor,
    };

    if (series && editScope !== "this") {
      startTransition(() =>
        updateSeriesClasses({
          ...formPayload,
          scope: editScope,
          seriesId: series.id,
        })
      );
    } else {
      startTransition(() => updateLiveClass(formPayload));
    }
  }

  function handleCancel() {
    startTransition(() => cancelLiveClass(liveClass.id));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {series && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary-light)]/20 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Esta clase es parte de una serie recurrente
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "this", label: "Solo esta clase" },
                { value: "thisAndFollowing", label: "Esta y las siguientes" },
                { value: "all", label: "Toda la serie" },
              ] as { value: EditScope; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEditScope(opt.value)}
                className={`rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors ${
                  editScope === opt.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {editScope === "this" && "Los cambios solo se aplican a esta instancia. Se desvincula de la serie."}
            {editScope === "thisAndFollowing" && "Se aplica a esta clase y todas las instancias futuras de la serie."}
            {editScope === "all" && "Se actualiza la serie completa y todas sus instancias."}
          </p>
        </div>
      )}

      {isPast && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]">
          Esta clase ya ocurrió. Los cambios se guardan pero no afectan lo ya registrado.
        </div>
      )}

      {/* Nombre */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Nombre de la clase
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={liveClass.title}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
        />
      </div>

      {/* Disciplina + Profesora */}
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
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="instructorId" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Profesora
          </label>
          <select
            id="instructorId"
            name="instructorId"
            defaultValue={liveClass.instructorId ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          >
            <option value="">Sin asignar</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.userId}>
                {inst.name || inst.email}
              </option>
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
            defaultValue={liveClass.durationMinutes}
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
          defaultValue={liveClass.maxCapacity}
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
            {selectedDisciplineId
              ? "Heredado de la disciplina. Podés cambiarlo."
              : "Color para el calendario."}
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label
          className="inline-flex items-center gap-2 cursor-not-allowed opacity-50"
          title="Requiere configurar Zoom o Meet en Plugins"
        >
          <input type="checkbox" disabled className="rounded border-[var(--color-border)]" />
          <span className="text-sm text-[var(--color-text)]">Clase online</span>
          <span className="text-xs text-[var(--color-text-muted)]">(requiere plugin)</span>
        </label>
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
            defaultValue={liveClass.trialCapacity ?? 2}
            className="w-32 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        <Button href="/panel/horarios" variant="secondary">
          Cancelar
        </Button>

        <div className="ml-auto">
          {!confirmCancel ? (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="text-sm text-[var(--color-error)] hover:underline"
            >
              Cancelar clase
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                {reservationCount > 0
                  ? `${reservationCount} reserva${reservationCount !== 1 ? "s" : ""} se cancelarán.`
                  : "¿Confirmar?"}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-[var(--radius-md)] bg-[var(--color-error)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-error)]/80 disabled:opacity-50"
              >
                Sí, cancelar
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="text-xs text-[var(--color-text-muted)] hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
