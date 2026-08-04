"use client";

import { useTransition, useState, useMemo, useRef, useEffect } from "react";
import { createLiveClass, createMeetingForClass, updateMeetingForClass } from "../actions";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Discipline } from "@/lib/domain";
import type { Instructor } from "@/lib/ports/instructor-repository";
import { useTimezone } from "@/components/providers/TimezoneProvider";
import { RecurrenceField, type RecurrenceValue } from "@/components/panel/horarios/RecurrenceField";

function nowLocalISO(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
}

function providerLabel(provider: "zoom" | "meet"): string {
  return provider === "zoom" ? "Zoom" : "Meet";
}

const NO_RECURRENCE: RecurrenceValue = {
  repeat: "none",
  repeatOnDays: [],
  repeatEveryN: 1,
  repeatEnd: "never",
  repeatEndDate: null,
  repeatEndCount: null,
  monthlyMode: null,
};

interface Props {
  disciplines: Discipline[];
  instructors: Instructor[];
  defaultDate?: string;
  defaultHour?: string;
  defaultDuration?: number;
  videoProviders?: { zoom: boolean; meet: boolean };
}

export function CreateClassForm({ disciplines, instructors, defaultDate, defaultHour, defaultDuration = 60, videoProviders = { zoom: false, meet: false } }: Props) {
  const tz = useTimezone();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasVideoProvider = videoProviders.zoom || videoProviders.meet;
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [meetingExternalId, setMeetingExternalId] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<"zoom" | "meet" | null>(null);
  const [meetingFailCount, setMeetingFailCount] = useState(0);
  const [manualMeetingUrl, setManualMeetingUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Espejo mínimo de nombre/duración en estado sólo para poder disparar el
  // auto-generado (el resto del form sigue no controlado vía FormData).
  const [titleValue, setTitleValue] = useState("");
  const [durationValue, setDurationValue] = useState(defaultDuration);
  const lastAutoSyncRef = useRef<string | null>(null);

  // Con exactamente un proveedor conectado, la generación es automática (sin
  // botón). Con los dos conectados, se mantienen los botones manuales.
  const singleProvider: "zoom" | "meet" | null =
    videoProviders.zoom !== videoProviders.meet ? (videoProviders.zoom ? "zoom" : "meet") : null;

  // Recurrence (manejada por <RecurrenceField/>, que emite el valor resuelto)
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(NO_RECURRENCE);
  const [startsAtValue, setStartsAtValue] = useState(
    defaultDate && defaultHour ? `${defaultDate}T${String(defaultHour).padStart(2, "0")}:00` : ""
  );
  const autoGenerateFieldsReady = !!titleValue.trim() && !!startsAtValue;

  // Toggles
  const [acceptsTrialReservations, setAcceptsTrialReservations] = useState(false);

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
    const trialCapacity = acceptsTrialReservations ? Number(fd.get("trialCapacity")) || 2 : null;

    if (!title || !startsAt) return;
    if (new Date(startsAt) <= new Date()) {
      setError("No se pueden agendar clases en el pasado.");
      return;
    }

    const manualUrl = manualMeetingUrl?.trim() || "";
    const meetingUrlToUse: string | null = manualUrl || meetingUrl || null;
    if (isOnline && hasVideoProvider && !meetingUrlToUse) {
      setMeetingError("Genera el link con el botón de abajo o pega uno manualmente.");
      return;
    }
    // Un link pegado a mano no tiene ID de reunión asociado (no lo generamos
    // nosotros) — sólo persistimos provider/externalId cuando se usó el link
    // recién generado con el botón.
    const usingGeneratedMeeting = !manualUrl && !!meetingUrl;

    const startsAtIso = new Date(startsAt).toISOString();

    startTransition(() =>
      createLiveClass({
        title,
        disciplineId,
        instructorId,
        startsAt: startsAtIso,
        durationMinutes,
        maxCapacity,
        isOnline: !!meetingUrlToUse,
        meetingUrl: meetingUrlToUse,
        meetingProvider: usingGeneratedMeeting ? lastUsedProvider : null,
        meetingExternalId: usingGeneratedMeeting ? meetingExternalId : null,
        acceptsTrialReservations,
        trialCapacity,
        color: effectiveColor,
        repeat: recurrence.repeat,
        repeatOnDays: recurrence.repeatOnDays,
        repeatEveryN: recurrence.repeatEveryN,
        repeatEnd: recurrence.repeatEnd,
        repeatEndDate: recurrence.repeatEndDate,
        repeatEndCount: recurrence.repeatEndCount,
        monthlyMode: recurrence.monthlyMode,
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
      setMeetingError("Completa nombre y fecha/hora para generar el link.");
      return;
    }
    setMeetingError(null);
    setMeetingLoading(true);
    try {
      const startTime = new Date(startsAt).toISOString();
      const recurring = recurrence.repeat !== "none";
      const res = await createMeetingForClass(provider, { title, startTime, durationMinutes, recurring });
      setMeetingUrl(res.joinUrl);
      setMeetingExternalId(res.externalId);
      setManualMeetingUrl("");
      setLastUsedProvider(provider);
      setMeetingFailCount(0);
      lastAutoSyncRef.current = `${provider}|${title}|${startsAt}|${durationMinutes}`;
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "No se pudo crear la reunión.");
      setMeetingFailCount((c) => c + 1);
    } finally {
      setMeetingLoading(false);
    }
  }

  /**
   * Sincroniza la reunión ya generada con los datos actuales del form (título
   * y/o horario), en vez de crear una nueva — evita una reunión "fantasma"
   * huérfana cada vez que el admin sigue ajustando la clase.
   */
  async function handleUpdateGeneratedMeeting(
    provider: "zoom" | "meet",
    externalId: string,
    title: string,
    startsAt: string,
    durationMinutes: number
  ) {
    setMeetingError(null);
    setMeetingLoading(true);
    try {
      await updateMeetingForClass(provider, externalId, {
        title,
        startTime: new Date(startsAt).toISOString(),
        durationMinutes,
      });
      setMeetingFailCount(0);
      lastAutoSyncRef.current = `${provider}|${title}|${startsAt}|${durationMinutes}`;
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "No se pudo actualizar la reunión.");
      setMeetingFailCount((c) => c + 1);
    } finally {
      setMeetingLoading(false);
    }
  }

  // Auto-generar (sin botón) cuando la clase es online, hay exactamente un
  // proveedor conectado y ya están los campos mínimos. Debounce ~600ms para
  // no disparar una llamada por cada tecla. Si ya existe una reunión
  // generada para este provider, sincroniza (PATCH) en vez de crear otra.
  useEffect(() => {
    if (!isOnline || !singleProvider || !autoGenerateFieldsReady) return;
    if (manualMeetingUrl.trim()) return; // el admin pegó un link a mano: no pisarlo

    const title = titleValue.trim();
    const startsAt = startsAtValue;
    const durationMinutes = durationValue || defaultDuration;
    const signature = `${singleProvider}|${title}|${startsAt}|${durationMinutes}`;

    const timer = setTimeout(() => {
      if (signature === lastAutoSyncRef.current) return;
      lastAutoSyncRef.current = signature;
      if (meetingExternalId && lastUsedProvider === singleProvider) {
        void handleUpdateGeneratedMeeting(singleProvider, meetingExternalId, title, startsAt, durationMinutes);
      } else {
        void handleGenerateMeeting(singleProvider);
      }
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, singleProvider, autoGenerateFieldsReady, titleValue, startsAtValue, durationValue]);

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
          onChange={(e) => setTitleValue(e.target.value)}
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
            onChange={(e) => setDurationValue(Number(e.target.value) || defaultDuration)}
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
                  setMeetingExternalId(null);
                  setMeetingError(null);
                  setLastUsedProvider(null);
                  setMeetingFailCount(0);
                  lastAutoSyncRef.current = null;
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
            checked={acceptsTrialReservations}
            onChange={(e) => setAcceptsTrialReservations(e.target.checked)}
            className="rounded border-[var(--color-border)]"
          />
          <span className="text-sm text-[var(--color-text)]">Acepta clase de prueba</span>
        </label>
      </div>

      {/* Generar link Zoom/Meet */}
      {isOnline && hasVideoProvider && (
        <div className="space-y-3">
          {singleProvider ? (
            !autoGenerateFieldsReady && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled
                  className="w-fit rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] opacity-50"
                >
                  Generar link con {providerLabel(singleProvider)}
                </button>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Completa nombre y fecha/hora para generar el link.
                </span>
              </div>
            )
          ) : (
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
          )}

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
                Pega el link de la reunión manualmente
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
            defaultValue={2}
            className="w-32 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
      )}

      <RecurrenceField selectedDate={selectedDate} tz={tz} onChange={setRecurrence} />

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
