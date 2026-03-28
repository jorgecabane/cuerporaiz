"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { SITE_NAME } from "@/lib/constants/copy";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/panel";
  const isReset = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [centerId, setCenterId] = useState("cuerporaiz");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        centerId,
        redirect: false,
      });
      if (result?.error) {
        if (result.error === "RATE_LIMITED" || result.error.includes("RATE_LIMITED")) {
          setError("Demasiados intentos. Espera 15 minutos e intenta de nuevo.");
        } else {
          setError("Email o contraseña incorrectos. Revisa el centro si aplica.");
        }
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
        <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
          Entrar a {SITE_NAME}
        </h1>

        {isReset && (
          <p className="mb-[var(--space-4)] rounded-[var(--radius-md)] bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
            Contraseña actualizada. Inicia sesión.
          </p>
        )}

        <GoogleSignInButton centerId={centerId} />

        <div className="my-[var(--space-5)] flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-muted)]">o</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

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
          <label className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">Contraseña</span>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[var(--color-secondary)] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/signup" className="text-[var(--color-secondary)] hover:underline">
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
