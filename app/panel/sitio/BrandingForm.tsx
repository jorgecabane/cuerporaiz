"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteConfig } from "@/lib/domain/site-config";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";

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
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(config?.heroImageUrl ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(config?.logoUrl ?? null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(config?.faviconUrl ?? null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    const body: Record<string, string | null> = {};
    for (const key of ["heroEyebrow", "heroTitle", "heroSubtitle", "seoTitle", "seoDescription"]) {
      const val = (fd.get(key) as string)?.trim();
      body[key] = val || null;
    }
    body.heroImageUrl = heroImageUrl;
    body.logoUrl = logoUrl;
    body.faviconUrl = faviconUrl;
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
          <label htmlFor="branding-heroEyebrow" className={labelCls}>
            Bajada (eyebrow)
          </label>
          <input
            id="branding-heroEyebrow"
            name="heroEyebrow"
            defaultValue={config?.heroEyebrow ?? ""}
            maxLength={100}
            placeholder="Ej: yoga con identidad"
            className={inputCls}
          />
        </div>
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
          <label className={labelCls}>Imagen</label>
          <SanityImagePicker
            value={heroImageUrl}
            onChange={setHeroImageUrl}
            label="Imagen del hero"
            aspect="wide"
            imageKind="hero"
          />
        </div>
      </fieldset>

      {/* Logo */}
      <div>
        <label className={labelCls}>Logo</label>
        <SanityImagePicker
          value={logoUrl}
          onChange={setLogoUrl}
          label="Logo del centro"
          aspect="square"
          imageKind="logo"
        />
      </div>

      {/* Favicon */}
      <div>
        <label className={labelCls}>Favicon</label>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">
          Imagen cuadrada, PNG o SVG. Mínimo recomendado <strong>256×256 px</strong>, ideal{" "}
          <strong>512×512 px</strong>. Se usará para la pestaña del navegador (32×32) y para iOS
          (180×180).
        </p>
        <SanityImagePicker
          value={faviconUrl}
          onChange={setFaviconUrl}
          label="Favicon del sitio"
          aspect="square"
          imageKind="favicon"
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

      {/* SEO */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">SEO</legend>
        <p className="text-xs text-[var(--color-text-muted)]">
          Aparece cuando alguien comparte tu sitio en WhatsApp, redes o buscadores. Si dejás los
          campos vacíos, usamos el título y la descripción por defecto.
        </p>
        <div>
          <label htmlFor="branding-seoTitle" className={labelCls}>
            Título SEO
          </label>
          <input
            id="branding-seoTitle"
            name="seoTitle"
            defaultValue={config?.seoTitle ?? ""}
            maxLength={120}
            placeholder="Ej: Cuerpo Raíz — yoga con identidad para volver a tu cuerpo"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Recomendado: 50-60 caracteres.</p>
        </div>
        <div>
          <label htmlFor="branding-seoDescription" className={labelCls}>
            Descripción SEO
          </label>
          <textarea
            id="branding-seoDescription"
            name="seoDescription"
            defaultValue={config?.seoDescription ?? ""}
            maxLength={300}
            rows={3}
            placeholder="Resumí en 1-2 frases qué ofrece tu centro, dónde y a quién."
            className={inputCls}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Recomendado: 110-160 caracteres.</p>
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
