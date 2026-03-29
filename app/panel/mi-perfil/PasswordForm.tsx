"use client";

import { useState, useTransition } from "react";

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

interface PasswordFormProps {
  hasPassword: boolean;
}

export default function PasswordForm({ hasPassword }: PasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = hasPassword ? (fd.get("currentPassword") as string)?.trim() : undefined;
    const newPassword = (fd.get("newPassword") as string)?.trim();
    const confirmPassword = (fd.get("confirmPassword") as string)?.trim();

    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al cambiar contraseña");
      } else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  const title = hasPassword ? "Cambiar contraseña" : "Crear contraseña";
  const buttonLabel = hasPassword ? "Cambiar contraseña" : "Crear contraseña";
  const pendingLabel = hasPassword ? "Cambiando..." : "Creando...";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t border-[var(--color-border)]">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>

      {hasPassword && (
        <div>
          <label htmlFor="pwd-current" className={labelCls}>Contraseña actual</label>
          <input id="pwd-current" name="currentPassword" type="password" required className={inputCls} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="pwd-new" className={labelCls}>Nueva contraseña</label>
          <input id="pwd-new" name="newPassword" type="password" required minLength={8} className={inputCls} />
        </div>
        <div>
          <label htmlFor="pwd-confirm" className={labelCls}>Confirmar contraseña</label>
          <input id="pwd-confirm" name="confirmPassword" type="password" required minLength={8} className={inputCls} />
        </div>
      </div>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      {success && <p className="text-xs text-green-600">{hasPassword ? "Contraseña actualizada" : "Contraseña creada"}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? pendingLabel : buttonLabel}
      </button>
    </form>
  );
}
