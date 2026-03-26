"use client";

import { useState } from "react";

interface UnlockModalProps {
  lessonId: string;
  lessonTitle: string;
  categoryName: string;
  remaining: number | null;
  onClose: () => void;
  onUnlocked: () => void;
}

export function UnlockModal({
  lessonId,
  lessonTitle,
  categoryName,
  remaining,
  onClose,
  onUnlocked,
}: UnlockModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/on-demand/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const messages: Record<string, string> = {
          QUOTA_EXHAUSTED: "No tienes clases disponibles en esta categoría.",
          NO_ACTIVE_PLAN: "No tienes un plan activo.",
          ALREADY_UNLOCKED: "Esta clase ya fue desbloqueada.",
          NO_QUOTA_CONFIGURED: "Tu plan no incluye acceso a esta categoría.",
        };
        setError(messages[data?.code] ?? "No se pudo desbloquear la clase. Intenta de nuevo.");
        return;
      }
      onUnlocked();
      onClose();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const confirmText =
    remaining !== null
      ? `Vas a usar 1 de tus ${remaining} clases restantes de ${categoryName}. ¿Confirmar?`
      : `Vas a desbloquear esta clase. ¿Confirmar?`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
          Desbloquear clase
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-1">
          <span className="font-medium text-[var(--color-text)]">{lessonTitle}</span>
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">{confirmText}</p>

        {error && <p className="text-xs text-[var(--color-error)] mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {loading ? "Desbloqueando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
