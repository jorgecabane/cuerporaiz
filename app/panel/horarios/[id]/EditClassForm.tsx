"use client";

import { useTransition, useState, useMemo, useRef } from "react";
import {
  updateLiveClass,
  cancelLiveClassWithScope,
  previewCancelScope,
  updateSeriesClasses,
  createMeetingForClass,
} from "../actions";
import type { EditScope, CancelScopePreview, EditSeriesFormData } from "../actions";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RecurrenceField, type RecurrenceValue } from "@/components/panel/horarios/RecurrenceField";
import { useTimezone } from "@/components/providers/TimezoneProvider";
import {
  buildSeriesScheduleFields,
  buildSeriesEditPreview,
  type SeriesEditPreview,
  type SeriesEditConflict,
  type SeriesInstanceInfo,
} from "@/lib/application/series-edit";
import type { LiveClass, Discipline, LiveClassSeries } from "@/lib/domain";
import type { Instructor } from "@/lib/ports/instructor-repository";

function cancelDialogTitle(
  hasSeries: boolean,
  scope: EditScope,
  preview: CancelScopePreview | null,
): string {
  if (!hasSeries || scope === "this") return "¿Cancelar esta clase?";
  if (scope === "thisAndFollowing") {
    return preview
      ? `¿Cancelar esta clase y las siguientes (${preview.classCount} en total)?`
      : "¿Cancelar esta clase y las siguientes?";
  }
  return preview
    ? `¿Cancelar toda la serie (${preview.classCount} clases)?`
    : "¿Cancelar toda la serie?";
}

function cancelDialogDescription(
  loading: boolean,
  preview: CancelScopePreview | null,
): string {
  if (loading || !preview) return "Calculando alcance…";
  const lines: string[] = [
    `Se marcarán como canceladas ${preview.classCount} clase${preview.classCount === 1 ? "" : "s"}.`,
  ];
  if (preview.willEmailCount > 0) {
    lines.push(
      `${preview.willEmailCount} alumno${preview.willEmailCount === 1 ? "" : "s"} con reserva en clases futuras recibirá${preview.willEmailCount === 1 ? "" : "n"} un correo de notificación.`,
    );
  } else {
    lines.push("No se enviarán correos (no hay reservas activas en clases futuras).");
  }
  lines.push("Esta acción no se puede deshacer.");
  return lines.join(" ");
}

function toLocalISO(d: Date): string {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function toLocalDateInput(d: Date): string {
  return toLocalISO(d).slice(0, 10);
}

/** Mapea una serie persistida al valor inicial del editor de recurrencia. */
function seriesToRecurrence(series: LiveClassSeries): RecurrenceValue {
  const repeatEnd: RecurrenceValue["repeatEnd"] =
    series.repeatCount != null ? "count" : series.endsAt != null ? "date" : "never";
  return {
    repeat: series.repeatFrequency,
    repeatOnDays: series.repeatOnDaysOfWeek,
    repeatEveryN: series.repeatEveryN,
    repeatEnd,
    repeatEndDate: series.endsAt ? toLocalDateInput(series.endsAt) : null,
    repeatEndCount: series.repeatCount,
    monthlyMode: (series.monthlyMode as "dayOfMonth" | "weekdayOrdinal" | null) ?? null,
  };
}

interface Props {
  liveClass: LiveClass;
  disciplines: Discipline[];
  instructors: Instructor[];
  series: LiveClassSeries | null;
  /** Instancias ACTIVAS de la serie + reservas confirmadas (preview client-side). */
  seriesInstances?: SeriesInstanceInfo[];
  holidayKeys?: string[];
  seriesTimeZone?: string;
  detachedCount?: number;
  defaultDuration: number;
  videoProviders?: { zoom: boolean; meet: boolean };
}

export function EditClassForm({
  liveClass,
  disciplines,
  instructors,
  series,
  seriesInstances = [],
  holidayKeys = [],
  seriesTimeZone = "America/Santiago",
  detachedCount = 0,
  defaultDuration,
  videoProviders = { zoom: false, meet: false },
}: Props) {
  const tz = useTimezone();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<CancelScopePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editScope, setEditScope] = useState<EditScope>("this");

  // Edición de recurrencia + flujo de confirmación (scope all / thisAndFollowing).
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(
    series ? seriesToRecurrence(series) : {
      repeat: "none", repeatOnDays: [], repeatEveryN: 1,
      repeatEnd: "never", repeatEndDate: null, repeatEndCount: null, monthlyMode: null,
    },
  );
  const [seriesConfirmOpen, setSeriesConfirmOpen] = useState(false);
  const [seriesPreview, setSeriesPreview] = useState<SeriesEditPreview | null>(null);
  const [pendingEdit, setPendingEdit] = useState<EditSeriesFormData | null>(null);
  // Conflicto detectado por el servidor (carrera: reserva creada entre el preview
  // client-side y el guardado).
  const [raceConflict, setRaceConflict] = useState<SeriesEditConflict | null>(null);

  const [acceptsTrialReservations, setAcceptsTrialReservations] = useState(liveClass.acceptsTrialReservations);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(
    liveClass.disciplineId ?? ""
  );
  const [colorOverride, setColorOverride] = useState<string | null>(
    liveClass.color
  );
  const [startsAtValue, setStartsAtValue] = useState(
    toLocalISO(new Date(liveClass.startsAt))
  );
  const [isOnline, setIsOnline] = useState(liveClass.isOnline && !!liveClass.meetingUrl);
  const [meetingUrlValue, setMeetingUrlValue] = useState(liveClass.meetingUrl ?? "");
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [generatingMeeting, setGeneratingMeeting] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<"zoom" | "meet" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hasVideoProvider = videoProviders.zoom || videoProviders.meet;

  const disciplineColor = useMemo(() => {
    if (!selectedDisciplineId) return null;
    return disciplines.find((d) => d.id === selectedDisciplineId)?.color ?? null;
  }, [selectedDisciplineId, disciplines]);

  // Memoizado: pasar `new Date(...)` inline crea una identidad nueva cada render y
  // dispara el efecto emisor de RecurrenceField en loop ("Maximum update depth").
  const recurrenceSelectedDate = useMemo(
    () => (startsAtValue ? new Date(startsAtValue) : null),
    [startsAtValue],
  );

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
    const trialCapacity = acceptsTrialReservations
      ? Number(fd.get("trialCapacity")) || 2
      : null;

    if (!title || !startsAt) return;
    const startsAtIso = new Date(startsAt).toISOString();
    const meetingUrl = isOnline ? (meetingUrlValue?.trim() || null) : null;
    const formPayload = {
      id: liveClass.id,
      title,
      disciplineId,
      instructorId,
      startsAt: startsAtIso,
      durationMinutes,
      maxCapacity,
      isOnline: !!meetingUrl,
      meetingUrl,
      acceptsTrialReservations,
      trialCapacity,
      color: effectiveColor,
    };

    if (!series) {
      startTransition(() => updateLiveClass(formPayload));
      return;
    }

    const editData: EditSeriesFormData = {
      ...formPayload,
      scope: editScope,
      seriesId: series.id,
      repeat: recurrence.repeat === "none" ? "WEEKLY" : recurrence.repeat,
      repeatOnDays: recurrence.repeatOnDays,
      repeatEveryN: recurrence.repeatEveryN,
      repeatEnd: recurrence.repeatEnd,
      repeatEndDate: recurrence.repeatEndDate,
      repeatEndCount: recurrence.repeatEndCount,
      monthlyMode: recurrence.monthlyMode,
    };

    // scope="this": desvincula y mueve sólo esta instancia (sin confirmación).
    if (editScope === "this") {
      runSeriesEdit(editData);
      return;
    }

    // all / thisAndFollowing: valida y muestra el preview client-side; al confirmar
    // se ejecuta la mutación.
    const validationError = validateRecurrence();
    if (validationError) {
      setError(validationError);
      return;
    }
    // Preview en el CLIENTE con los datos cargados al render (sin server action).
    setSeriesPreview(
      buildSeriesEditPreview({
        series,
        fields: buildSeriesScheduleFields(editData),
        scope: editScope,
        openedInstanceId: liveClass.id,
        openedStartsAt: new Date(liveClass.startsAt),
        instances: seriesInstances,
        newCapacity: maxCapacity,
        holidayKeys: new Set(holidayKeys),
        tz: seriesTimeZone,
        now: new Date(),
        detachedCount,
      }),
    );
    setPendingEdit(editData);
    setSeriesConfirmOpen(true);
  }

  /**
   * Ejecuta la mutación de serie. El action RETORNA el resultado (no redirige): en
   * éxito navegamos con router.push; en conflicto (carrera) mostramos el detalle.
   * Evita depender del redirect del server action, que no navega cuando la propia
   * operación borra la instancia que se está viendo.
   */
  function runSeriesEdit(data: EditSeriesFormData) {
    setRaceConflict(null);
    startTransition(async () => {
      const res = await updateSeriesClasses(data);
      if (res && !res.ok) {
        setRaceConflict(res.conflict);
        setSeriesConfirmOpen(true);
        return;
      }
      // Navegación dura: el refresh RSC del server action pelea con router.push,
      // así que forzamos la navegación al listado.
      window.location.assign("/panel/horarios");
    });
  }

  function validateRecurrence(): string | null {
    if (recurrence.repeatEveryN < 1) return "El intervalo de repetición debe ser al menos 1.";
    if (recurrence.repeatEnd === "count" && (recurrence.repeatEndCount ?? 0) < 1)
      return "La cantidad de repeticiones debe ser al menos 1.";
    if (recurrence.repeatEnd === "date" && recurrence.repeatEndDate && startsAtValue) {
      if (new Date(recurrence.repeatEndDate) < new Date(startsAtValue))
        return "La fecha de término no puede ser anterior a la fecha de inicio.";
    }
    return null;
  }

  function closeSeriesConfirm() {
    setSeriesConfirmOpen(false);
    setSeriesPreview(null);
    setPendingEdit(null);
    setRaceConflict(null);
  }

  function confirmSeriesEdit() {
    if (pendingEdit) runSeriesEdit(pendingEdit);
  }

  // El conflicto del servidor (carrera) tiene prioridad sobre el del preview.
  const activeConflict = raceConflict ?? seriesPreview?.conflict ?? null;

  function formatConflictWhen(iso: string): string {
    return new Date(iso).toLocaleString("es-CL", {
      timeZone: tz,
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const cancelScope: EditScope = series ? editScope : "this";

  async function openCancelConfirm() {
    setPreview(null);
    setLoadingPreview(true);
    setConfirmOpen(true);
    try {
      const p = await previewCancelScope(liveClass.id, cancelScope);
      setPreview(p);
    } catch {
      setPreview({ classCount: 0, willEmailCount: 0 });
    } finally {
      setLoadingPreview(false);
    }
  }

  function closeCancelConfirm() {
    setConfirmOpen(false);
    setPreview(null);
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelLiveClassWithScope(liveClass.id, cancelScope);
      window.location.assign("/panel/horarios");
    });
  }

  async function handleGenerateMeeting(provider: "zoom" | "meet") {
    if (!formRef.current) return;
    setMeetingError(null);
    setGeneratingMeeting(true);
    const fd = new FormData(formRef.current);
    const title = (fd.get("title") as string)?.trim();
    const startsAt = fd.get("startsAt") as string;
    const durationMinutes = Number(fd.get("durationMinutes")) || defaultDuration;
    if (!title || !startsAt) {
      setMeetingError("Completa nombre y fecha/hora.");
      setGeneratingMeeting(false);
      return;
    }
    try {
      const startTime = new Date(startsAt).toISOString();
      const res = await createMeetingForClass(provider, { title, startTime, durationMinutes });
      setMeetingUrlValue(res.joinUrl);
      setLastUsedProvider(provider);
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "No se pudo crear la reunión.");
    } finally {
      setGeneratingMeeting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
            {editScope === "this" && "Los cambios y la cancelación solo aplican a esta instancia. Se desvincula de la serie."}
            {editScope === "thisAndFollowing" && "Aplica a esta clase y todas las instancias futuras de la serie."}
            {editScope === "all" && "Aplica a la serie completa y todas sus instancias."}
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
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
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

      {/* Recurrencia: editable cuando se edita la serie (no "solo esta") */}
      {series && editScope !== "this" && (
        <RecurrenceField
          selectedDate={recurrenceSelectedDate}
          tz={tz}
          allowNone={false}
          initial={seriesToRecurrence(series)}
          onChange={setRecurrence}
        />
      )}

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
              ? "Heredado de la disciplina. Puedes cambiarlo."
              : "Color para el calendario."}
          </span>
        </div>
      </div>

      {/* Toggles: clase online + prueba */}
      <div className="flex flex-wrap gap-4">
        {hasVideoProvider ? (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => {
                setIsOnline(e.target.checked);
                if (!e.target.checked) {
                  setMeetingUrlValue("");
                  setMeetingError(null);
                }
              }}
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text)]">Clase online</span>
          </label>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <label className="inline-flex items-center gap-2 cursor-not-allowed opacity-50" title="Requiere configurar Zoom o Meet en Plugins">
              <input type="checkbox" disabled checked={isOnline} className="rounded border-[var(--color-border)]" readOnly />
              <span className="text-sm text-[var(--color-text)]">Clase online</span>
              <span className="text-xs text-[var(--color-text-muted)]">(requiere plugin)</span>
            </label>
            {isOnline && meetingUrlValue && (
              <div className="flex gap-2">
                <input type="text" readOnly value={meetingUrlValue} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]" />
                <button type="button" onClick={() => navigator.clipboard.writeText(meetingUrlValue)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]">Copiar</button>
              </div>
            )}
          </div>
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptsTrialReservations}
            onChange={(e) => setAcceptsTrialReservations(e.target.checked)}
            className="rounded border-[var(--color-border)]"
          />
          <span className="text-sm text-[var(--color-text)]">Acepta clase de prueba</span>
        </label>
      </div>

      {/* URL de reunión (solo si Clase online y hay plugin) */}
      {isOnline && hasVideoProvider && (
      <div className="space-y-2">
        <label htmlFor="meetingUrl" className="block text-sm font-medium text-[var(--color-text)]">
          Link de la reunión
        </label>
        <div className="flex flex-wrap gap-2">
            {videoProviders.zoom && (
              <button
                type="button"
                disabled={generatingMeeting}
                onClick={() => handleGenerateMeeting("zoom")}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                {generatingMeeting ? "Creando…" : "Generar con Zoom"}
              </button>
            )}
            {videoProviders.meet && (
              <button
                type="button"
                disabled={generatingMeeting}
                onClick={() => handleGenerateMeeting("meet")}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                {generatingMeeting ? "Creando…" : "Generar con Meet"}
              </button>
            )}
          </div>
        {generatingMeeting && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!generatingMeeting && (
          <>
            <input
              id="meetingUrl"
              name="meetingUrl"
              type="url"
              placeholder="https://zoom.us/j/... o https://meet.google.com/..."
              value={meetingUrlValue}
              onChange={(e) => setMeetingUrlValue(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] text-sm"
            />
            {meetingUrlValue && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(meetingUrlValue)}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Copiar link
                </button>
              </div>
            )}
          </>
        )}
        {meetingError && (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-error-bg,#fef2f2)] p-3 text-sm text-[var(--color-error,#dc2626)]">
            {meetingError}
            <button type="button" onClick={() => handleGenerateMeeting(lastUsedProvider ?? (videoProviders.zoom ? "zoom" : "meet"))} className="ml-2 underline font-medium">Reintentar</button>
          </div>
        )}
        <p className="text-xs text-[var(--color-text-muted)]">
          Al desmarcar «Clase online» el link se borra al guardar.
        </p>
      </div>
      )}

      {acceptsTrialReservations && (
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
          <button
            type="button"
            onClick={openCancelConfirm}
            className="text-sm text-[var(--color-error)] hover:underline"
          >
            Cancelar clase
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleCancel}
        onCancel={closeCancelConfirm}
        title={cancelDialogTitle(!!series, cancelScope, preview)}
        description={cancelDialogDescription(loadingPreview, preview)}
        confirmLabel="Sí, cancelar"
        cancelLabel="No, volver"
        variant="danger"
        loading={isPending || loadingPreview}
      />

      {seriesConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeSeriesConfirm}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              {editScope === "all" ? "Editar toda la serie" : "Editar esta y las siguientes"}
            </h3>

            {activeConflict ? (
              <div className="space-y-3 text-sm">
                {activeConflict.reservationClasses.length > 0 && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-bg)] p-3">
                    <p className="font-medium text-[var(--color-text)]">
                      Estas clases tienen reservas confirmadas. Cancélalas o gestiónalas antes de cambiar el horario:
                    </p>
                    <ul className="mt-2 space-y-1 text-[var(--color-text-muted)]">
                      {activeConflict.reservationClasses.map((c) => (
                        <li key={c.id}>
                          {formatConflictWhen(c.startsAt)} — {c.confirmed} reserva
                          {c.confirmed === 1 ? "" : "s"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeConflict.capacityClasses.length > 0 && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-bg)] p-3">
                    <p className="font-medium text-[var(--color-text)]">
                      El nuevo cupo es menor que las reservas confirmadas de estas clases:
                    </p>
                    <ul className="mt-2 space-y-1 text-[var(--color-text-muted)]">
                      {activeConflict.capacityClasses.map((c) => (
                        <li key={c.id}>
                          {formatConflictWhen(c.startsAt)} — {c.confirmed} reservas vs cupo {c.newCapacity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : seriesPreview ? (
              <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <p className="text-[var(--color-text)]">{seriesPreview.recurrenceSummary}</p>
                {seriesPreview.scheduleChanged ? (
                  <p>
                    Se regenerarán {seriesPreview.affectedCount} clase
                    {seriesPreview.affectedCount === 1 ? "" : "s"} desde el{" "}
                    {formatConflictWhen(seriesPreview.effectiveFrom)}.
                    {seriesPreview.pastPreserved > 0 &&
                      ` ${seriesPreview.pastPreserved} clase${seriesPreview.pastPreserved === 1 ? "" : "s"} anterior${seriesPreview.pastPreserved === 1 ? "" : "es"} no se modifica${seriesPreview.pastPreserved === 1 ? "" : "n"}.`}
                  </p>
                ) : (
                  <p>
                    Se actualizarán {seriesPreview.affectedCount} clase
                    {seriesPreview.affectedCount === 1 ? "" : "s"}.
                  </p>
                )}
                {seriesPreview.detachedCount > 0 && (
                  <p className="text-[var(--color-warning)]">
                    Hay {seriesPreview.detachedCount} clase
                    {seriesPreview.detachedCount === 1 ? "" : "s"} suelta
                    {seriesPreview.detachedCount === 1 ? "" : "s"} de esta serie (editada
                    {seriesPreview.detachedCount === 1 ? "" : "s"} individualmente) que no se
                    {seriesPreview.detachedCount === 1 ? " verá" : " verán"} afectada
                    {seriesPreview.detachedCount === 1 ? "" : "s"}.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeSeriesConfirm}
                className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-tertiary)]"
              >
                {activeConflict ? "Entendido" : "Cancelar"}
              </button>
              {!activeConflict && (
                <button
                  type="button"
                  onClick={confirmSeriesEdit}
                  disabled={isPending}
                  className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "Confirmar y guardar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
