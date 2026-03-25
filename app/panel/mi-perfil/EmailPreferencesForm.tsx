"use client";

import { useState, useEffect, useTransition } from "react";
import { EMAIL_PREFERENCE_LABELS, type EmailPreferenceType } from "@/lib/domain/email-preference";

type Prefs = Record<EmailPreferenceType, boolean>;

const PREF_KEYS: EmailPreferenceType[] = [
  "classReminder",
  "spotFreed",
  "planExpiring",
  "reservationConfirm",
  "purchaseConfirm",
];

export default function EmailPreferencesForm() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/email-preferences")
      .then((res) => res.json())
      .then((data) => setPrefs(data))
      .catch(() => setError("Error al cargar preferencias"));
  }, []);

  function toggle(key: EmailPreferenceType) {
    if (!prefs) return;
    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/me/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) {
        setPrefs({ ...prefs, [key]: !newValue }); // revert
        setError("Error al guardar preferencia");
      }
    });
  }

  if (!prefs) {
    return <p className="text-sm text-[var(--color-text-muted)]">Cargando preferencias...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">
        Elige qué correos quieres recibir. Los cambios se guardan automáticamente.
      </p>

      {PREF_KEYS.map((key) => (
        <label key={key} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
          <span className="text-sm text-[var(--color-text)]">{EMAIL_PREFERENCE_LABELS[key]}</span>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            disabled={isPending}
            onClick={() => toggle(key)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
              prefs[key] ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            } disabled:opacity-50`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                prefs[key] ? "translate-x-4 ml-0.5" : "translate-x-0 ml-0.5"
              }`}
            />
          </button>
        </label>
      ))}

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
    </div>
  );
}
