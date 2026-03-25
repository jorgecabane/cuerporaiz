"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteConfig } from "@/lib/domain/site-config";

interface BrandingFormProps {
  config: SiteConfig | null;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

export default function BrandingForm({ config }: BrandingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [colorPrimary, setColorPrimary] = useState(config?.colorPrimary ?? "#2D3B2A");
  const [colorSecondary, setColorSecondary] = useState(config?.colorSecondary ?? "#B85C38");
  const [colorAccent, setColorAccent] = useState(config?.colorAccent ?? "#F5E6D3");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    const body: Record<string, string | null> = {};
    for (const key of ["heroTitle", "heroSubtitle", "heroImageUrl", "logoUrl"]) {
      const val = (fd.get(key) as string)?.trim();
      body[key] = val || null;
    }
    body.colorPrimary = colorPrimary;
    body.colorSecondary = colorSecondary;
    body.colorAccent = colorAccent;

    startTransition(async () => {
      const res = await fetch("/api/panel/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hero section */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">Hero</legend>
        <div>
          <label htmlFor="branding-heroTitle" className={labelCls}>
            Título
          </label>
          <input
            id="branding-heroTitle"
            name="heroTitle"
            defaultValue={config?.heroTitle ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="branding-heroSubtitle" className={labelCls}>
            Subtítulo
          </label>
          <input
            id="branding-heroSubtitle"
            name="heroSubtitle"
            defaultValue={config?.heroSubtitle ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="branding-heroImageUrl" className={labelCls}>
            Imagen URL
          </label>
          <input
            id="branding-heroImageUrl"
            name="heroImageUrl"
            type="url"
            defaultValue={config?.heroImageUrl ?? ""}
            className={inputCls}
            placeholder="https://..."
          />
        </div>
      </fieldset>

      {/* Logo */}
      <div>
        <label htmlFor="branding-logoUrl" className={labelCls}>
          Logo URL
        </label>
        <input
          id="branding-logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={config?.logoUrl ?? ""}
          className={inputCls}
          placeholder="https://..."
        />
      </div>

      {/* Colors */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">Colores</legend>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorPrimary}
            onChange={(e) => setColorPrimary(e.target.value)}
            aria-label="Color primario"
            className="h-9 w-10 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5"
          />
          <span className="text-sm text-[var(--color-text-muted)] font-mono">{colorPrimary}</span>
          <span className="text-xs text-[var(--color-text-muted)]">Primario</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorSecondary}
            onChange={(e) => setColorSecondary(e.target.value)}
            aria-label="Color secundario"
            className="h-9 w-10 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5"
          />
          <span className="text-sm text-[var(--color-text-muted)] font-mono">{colorSecondary}</span>
          <span className="text-xs text-[var(--color-text-muted)]">Secundario</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorAccent}
            onChange={(e) => setColorAccent(e.target.value)}
            aria-label="Color de acento"
            className="h-9 w-10 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5"
          />
          <span className="text-sm text-[var(--color-text-muted)] font-mono">{colorAccent}</span>
          <span className="text-xs text-[var(--color-text-muted)]">Acento</span>
        </div>
      </fieldset>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      {success && <p className="text-xs text-green-600">Cambios guardados</p>}

      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
