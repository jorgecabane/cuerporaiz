"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants/copy";

export default function ForgotPasswordPage() {
  const [centerId, setCenterId] = useState("cuerporaiz");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId, email }),
      });
      if (res.status === 429) {
        setError("Demasiados intentos. Espera unos minutos.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
        <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
          Recuperar contraseña
        </h1>
        {success ? (
          <p className="text-sm text-[var(--color-text)]">
            Si el email existe, recibirás un enlace para recuperar tu contraseña.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-5)]">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">Centro (slug)</span>
              <input
                type="text"
                value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
                placeholder="cuerporaiz"
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-[var(--color-text)]"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
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
              {loading ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}
        <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
          <Link href="/auth/login" className="text-[var(--color-secondary)] hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
