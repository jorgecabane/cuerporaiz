"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE_NAME } from "@/lib/constants/copy";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const centerId = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG ?? "cuerporaiz";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          centerId,
          role: "STUDENT",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Error al crear la cuenta");
        setLoading(false);
        return;
      }
      router.push("/auth/login?registered=1");
      router.refresh();
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
        <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
          Crear cuenta en {SITE_NAME}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-5)]">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">Nombre (opcional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-[var(--color-text)]"
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
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">Contraseña (mín. 8)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>
        <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-[var(--color-secondary)] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
