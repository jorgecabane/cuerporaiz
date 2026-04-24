"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteConfig } from "@/lib/domain/site-config";

interface BlogSettingsFormProps {
  config: SiteConfig | null;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

export default function BlogSettingsForm({ config }: BlogSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [blogEnabled, setBlogEnabled] = useState(config?.blogEnabled ?? false);
  const [blogLabel, setBlogLabel] = useState(config?.blogLabel ?? "Blog");
  const router = useRouter();

  const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const isConfigured = Boolean(sanityProjectId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await fetch("/api/panel/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogEnabled, blogLabel: blogLabel.trim() || "Blog" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      {!isConfigured ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
          <p className="font-medium text-[var(--color-text)]">Sanity no está configurado todavía.</p>
          <p className="mt-1">
            Para activar el blog, seguí los pasos en{" "}
            <code className="rounded bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-1.5 py-0.5 font-mono text-xs">
              docs/sanity-setup.md
            </code>{" "}
            y agregá las variables{" "}
            <code className="rounded bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_SANITY_PROJECT_ID
            </code>{" "}
            y{" "}
            <code className="rounded bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-1.5 py-0.5 font-mono text-xs">
              SANITY_API_READ_TOKEN
            </code>{" "}
            a tu entorno.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Visibilidad en el sitio
          </legend>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={blogEnabled}
              onChange={(e) => setBlogEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-[var(--color-text)]">Mostrar link en el header</span>
              <p className="text-xs text-[var(--color-text-muted)]">
                Cuando está activo, el blog aparece en el menú principal. La URL pública es{" "}
                <code className="font-mono text-[11px]">/blog</code>.
              </p>
            </div>
          </label>

          <div>
            <label htmlFor="blogLabel" className={labelCls}>
              Texto del link
            </label>
            <input
              id="blogLabel"
              value={blogLabel}
              onChange={(e) => setBlogLabel(e.target.value)}
              className={inputCls}
              placeholder="Blog"
              maxLength={40}
            />
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-[var(--color-error,#b91c1c)]">{error}</p>
        ) : null}
        {success ? (
          <p className="text-sm text-[var(--color-primary)]">Cambios guardados.</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Editar contenido</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Crea y edita artículos, autores y categorías desde el Studio embebido. Solo administradores tienen acceso.
        </p>
        <a
          href="/studio"
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors ${
            isConfigured
              ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
              : "pointer-events-none border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60"
          }`}
        >
          Abrir Studio <span aria-hidden="true">→</span>
        </a>
      </section>

      <section className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Configuración técnica</h3>
        <p className="text-[var(--color-text-muted)]">
          <span className="font-mono">Project ID:</span>{" "}
          {sanityProjectId ? (
            <span className="font-mono text-[var(--color-text)]">{sanityProjectId}</span>
          ) : (
            <span className="italic">no configurado</span>
          )}
        </p>
        <p className="text-[var(--color-text-muted)]">
          <span className="font-mono">Dataset:</span>{" "}
          <span className="font-mono text-[var(--color-text)]">{sanityDataset}</span>
        </p>
      </section>
    </div>
  );
}
