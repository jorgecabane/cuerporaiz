"use client";

import { toast } from "@/components/ui/Toast";
import type { EntryLink } from "@/lib/email/event-online";

/** "Tus entradas": links personales de un evento online con botón copiar. */
export function EntryLinksList({ links }: { links: EntryLink[] }) {
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("No pudimos copiar el link. Cópialo a mano.");
    }
  }

  return (
    <section className="w-full rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] text-left">
      <h2 className="font-display text-xl font-semibold text-[var(--color-primary)]">Tus entradas</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Cada link es personal. La sala se abre 10 minutos antes del inicio.
      </p>
      <ul className="mt-[var(--space-4)] space-y-[var(--space-3)]">
        {links.map((l) => (
          <li key={l.url} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)]">{l.label}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{l.url}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(l.url)}
              aria-label={`Copiar link de ${l.label}`}
              className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-primary)] transition-transform duration-150 active:scale-[0.97]"
            >
              Copiar link
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
