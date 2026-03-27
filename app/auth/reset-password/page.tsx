"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === "EXPIRED_TOKEN") {
          setError("expired");
        } else {
          setError("invalid");
        }
        return;
      }

      router.push("/auth/login?reset=1");
    } catch {
      setError("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  if (error === "invalid") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
          <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
            Enlace inválido
          </h1>
          <p className="text-sm text-[var(--color-text)]">
            El enlace es inválido o ya fue usado.
          </p>
          <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
            <Link href="/auth/forgot-password" className="text-[var(--color-secondary)] hover:underline">
              Solicitar nuevo enlace
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
          <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
            Enlace expirado
          </h1>
          <p className="text-sm text-[var(--color-text)]">
            El enlace expiró.{" "}
            <Link href="/auth/forgot-password" className="text-[var(--color-secondary)] hover:underline">
              Solicita uno nuevo.
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
        <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
          Nueva contraseña
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-5)]">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-[var(--color-text)]"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">Confirmar contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-[var(--color-text)]"
              required
            />
          </label>
          {error && (
            <p className="text-sm text-[var(--color-secondary)]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Cargando…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
