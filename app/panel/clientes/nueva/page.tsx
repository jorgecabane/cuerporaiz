"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../actions";

export default function NuevaClientaPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string)?.trim();
    const name = (fd.get("name") as string)?.trim();

    if (!email) return;

    setError(null);
    startTransition(async () => {
      const result = await createClient({ email, name });
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/panel/clientes");
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link
        href="/panel/clientes"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 inline-block"
      >
        &larr; Estudiantes
      </Link>
      <h1 className="font-display text-section text-[var(--color-primary)] mb-6">
        Agregar estudiante
      </h1>
      <form
        onSubmit={handleSubmit}
        className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Si ya tiene cuenta, se vinculará a tu centro. Si no, se creará una cuenta nueva.
          </p>
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Nombre (opcional)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-error,#dc2626)]">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Agregar estudiante"}
        </button>
      </form>
    </div>
  );
}
