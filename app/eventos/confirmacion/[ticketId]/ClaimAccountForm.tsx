"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

type Props = {
  ticketId: string;
  token: string;
  email: string;
};

export function ClaimAccountForm({ ticketId, token, email }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/events/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "No pudimos crear tu cuenta.");
        return;
      }
      setDone(true);
      toast.success("¡Cuenta creada! Ya puedes iniciar sesión.");
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[var(--radius-2xl)] bg-[var(--color-primary)] p-[var(--space-6)] text-center text-[var(--color-text-inverse)]">
        <p className="font-display text-lg font-semibold">¡Tu cuenta está lista!</p>
        <p className="mt-1 text-sm text-[var(--color-text-inverse)]/80">
          Guardamos esta compra en tu cuenta.
        </p>
        <a
          href="/auth/login"
          className="mt-[var(--space-4)] inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-tertiary)] px-[var(--space-6)] font-semibold text-[var(--color-primary)] transition-colors hover:bg-white"
        >
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-2xl)] bg-[var(--color-primary)] p-[var(--space-6)] text-left text-[var(--color-text-inverse)]"
    >
      <h2 className="font-display text-xl font-semibold">Guarda esta compra en tu cuenta</h2>
      <p className="mt-1 text-sm text-[var(--color-text-inverse)]/80">
        Crea una contraseña y verás todas tus entradas cuando quieras, en cualquier dispositivo.
      </p>
      <div className="mt-[var(--space-4)] flex flex-col gap-1">
        <label htmlFor="claim-password" className="text-sm font-medium">
          Crea tu contraseña
        </label>
        <input
          id="claim-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="Mínimo 8 caracteres"
          className="min-h-[48px] rounded-[var(--radius-md)] border border-white/25 bg-white/10 px-3 text-base text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-white/30"
        />
      </div>
      <Button
        type="submit"
        variant="light"
        disabled={loading}
        className="mt-[var(--space-4)] w-full min-h-[48px] !border-[var(--color-tertiary)] bg-[var(--color-tertiary)] !text-[var(--color-primary)] hover:!bg-white"
      >
        {loading ? "Creando…" : "Crear mi cuenta"}
      </Button>
      <p className="mt-[var(--space-3)] text-center text-xs text-[var(--color-text-inverse)]/70">
        Usaremos {email} como tu correo de acceso.
      </p>
    </form>
  );
}
