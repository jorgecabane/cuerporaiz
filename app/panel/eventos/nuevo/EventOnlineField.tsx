"use client";

import { useState, type RefObject } from "react";
import { createMeetingForClass } from "@/app/panel/horarios/actions";
import type { VideoProviders } from "@/lib/application/get-video-providers";

type OnlineValue = { isOnline: boolean; meetingUrl: string | null };

type Props = {
  idPrefix: string;
  formRef: RefObject<HTMLFormElement | null>;
  videoProviders: VideoProviders;
  initialIsOnline: boolean;
  initialMeetingUrl: string | null;
  onChange: (value: OnlineValue) => void;
  error: string | null;
};

const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent";

const LINK_BUTTON_CLASS = "text-sm font-medium text-[var(--color-primary)] underline underline-offset-2";

/** Título y duración del evento leídos del form padre (no controlado). */
function readMeetingParams(form: HTMLFormElement | null) {
  if (!form) return null;
  const fd = new FormData(form);
  const title = (fd.get("title") as string)?.trim();
  const startsAt = fd.get("startsAt") as string;
  const endsAt = fd.get("endsAt") as string;
  if (!title || !startsAt || !endsAt) return null;
  const start = new Date(startsAt);
  const durationMinutes = Math.max(1, Math.round((new Date(endsAt).getTime() - start.getTime()) / 60_000));
  return { title, startTime: start.toISOString(), durationMinutes };
}

/**
 * "Evento online": al marcarlo genera el link con Zoom (o Meet) como la agenda.
 * Si no hay proveedor, faltan datos o falla, deja pegar el link a mano.
 */
export function EventOnlineField({
  idPrefix,
  formRef,
  videoProviders,
  initialIsOnline,
  initialMeetingUrl,
  onChange,
  error,
}: Props) {
  const provider = videoProviders.zoom ? "zoom" : videoProviders.meet ? "meet" : null;
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(initialMeetingUrl);
  const [manualUrl, setManualUrl] = useState("");
  const [showManual, setShowManual] = useState(initialIsOnline && !initialMeetingUrl);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  function emit(online: boolean, generated: string | null, manual: string) {
    onChange({ isOnline: online, meetingUrl: online ? manual.trim() || generated : null });
  }

  async function generate() {
    if (!provider) {
      setShowManual(true);
      return;
    }
    const params = readMeetingParams(formRef.current);
    if (!params) {
      setGenError("Completa título y fechas para generar el link.");
      setShowManual(true);
      return;
    }
    setLoading(true);
    setGenError(null);
    try {
      const { joinUrl } = await createMeetingForClass(provider, params);
      setGeneratedUrl(joinUrl);
      setManualUrl("");
      setShowManual(false);
      emit(true, joinUrl, "");
    } catch {
      setGenError("No pudimos generar el link. Pega el link de la reunión.");
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  }

  function toggle(checked: boolean) {
    setIsOnline(checked);
    emit(checked, generatedUrl, manualUrl);
    if (checked && !generatedUrl) void generate();
  }

  const providerLabel = provider === "zoom" ? "Zoom" : "Meet";

  return (
    <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <legend className="sr-only">Reunión online</legend>
      <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <input type="checkbox" checked={isOnline} onChange={(e) => toggle(e.target.checked)} />
        Evento online
      </label>

      {isOnline && (
        <div className="space-y-2">
          <div aria-live="polite">
            {loading && <p className="text-sm text-[var(--color-text-muted)]">Generando link…</p>}
            {genError && <p className="text-sm text-[var(--color-error)]">{genError}</p>}
          </div>

          {generatedUrl && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all text-sm text-[var(--color-text)]">{generatedUrl}</span>
              {provider && (
                <button type="button" onClick={generate} className={LINK_BUTTON_CLASS}>
                  Regenerar
                </button>
              )}
              {!showManual && (
                <button type="button" onClick={() => setShowManual(true)} className={LINK_BUTTON_CLASS}>
                  Cambiar link
                </button>
              )}
            </div>
          )}

          {!provider && !generatedUrl && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Conecta Zoom o Meet en Plugins para generar el link automáticamente, o pégalo aquí.
            </p>
          )}

          {showManual && (
            <div>
              <label
                htmlFor={`${idPrefix}-meetingUrl`}
                className="mb-1 block text-sm font-medium text-[var(--color-text)]"
              >
                Pega el link de la reunión
              </label>
              <input
                id={`${idPrefix}-meetingUrl`}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={manualUrl}
                onChange={(e) => {
                  setManualUrl(e.target.value);
                  emit(true, generatedUrl, e.target.value);
                }}
                aria-describedby={error ? `${idPrefix}-meetingUrl-error` : undefined}
                className={INPUT_CLASS}
              />
              {provider && (
                <button type="button" onClick={generate} disabled={loading} className={`mt-2 ${LINK_BUTTON_CLASS}`}>
                  Reintentar con {providerLabel}
                </button>
              )}
            </div>
          )}

          {error && (
            <p id={`${idPrefix}-meetingUrl-error`} role="alert" className="text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
