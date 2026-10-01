"use client";

import { useState } from "react";

type NewsletterSectionProps = { title?: string; subtitle?: string };
type Status = "idle" | "sending" | "done" | "error";

export function NewsletterSection({ title, subtitle }: NewsletterSectionProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), website: form.get("website") }),
    }).catch(() => null);
    if (res?.ok) {
      setStatus("done");
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.message ?? "No pudimos suscribirte. Intenta de nuevo.");
    setStatus("error");
  }

  return (
    <section
      id="newsletter"
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)]"
      aria-labelledby="newsletter-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-[var(--space-8)] rounded-[var(--radius-xl)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-10)] text-white md:grid-cols-[1.1fr_1fr] md:p-[var(--space-12)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">{subtitle ?? "Novedades"}</p>
          <h2 id="newsletter-heading" className="mt-[var(--space-3)] text-section font-display font-semibold">
            {title ?? "Lo nuevo del blog, en tu correo"}
          </h2>
          <p className="mt-[var(--space-3)] text-white/85">
            Te avisamos cuando publiquemos un artículo nuevo. Sin spam, y te das de baja cuando quieras.
          </p>
        </div>

        <div aria-live="polite">
          {status === "done" ? (
            <p role="status" className="rounded-[var(--radius-md)] bg-white/15 p-[var(--space-4)]">
              ✓ ¡Listo! Te llegará un correo cada vez que publiquemos un artículo nuevo.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-[var(--space-1)]">
                  <label htmlFor="newsletter-email" className="text-sm font-medium text-white/85">
                    Email
                  </label>
                  <input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    aria-invalid={status === "error"}
                    aria-describedby={error ? "newsletter-error" : "newsletter-legal"}
                    className="min-h-12 rounded-[var(--radius-md)] border-0 bg-white px-[var(--space-4)] text-base text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  />
                </div>
                {/* Honeypot: invisible para personas, los bots lo llenan */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="min-h-12 rounded-[var(--radius-md)] bg-[var(--color-accent,var(--color-tertiary))] px-[var(--space-6)] font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
                >
                  {status === "sending" ? "Enviando…" : "Suscribirme"}
                </button>
              </div>
              {error && (
                <p id="newsletter-error" role="alert" className="mt-[var(--space-2)] text-sm text-white">
                  {error}
                </p>
              )}
              <p id="newsletter-legal" className="mt-[var(--space-3)] text-xs text-white/70">
                Al suscribirte aceptas recibir correos de nuestro blog. Cada correo trae un link para darte de baja.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
