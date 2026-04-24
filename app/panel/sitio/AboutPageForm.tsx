"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AboutPageWithImages } from "@/lib/domain/about-page";
import { SiteLinkPicker } from "@/components/panel/sitio/SiteLinkPicker";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";

interface Props {
  page: AboutPageWithImages | null;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

export default function AboutPageForm({ page }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(page?.visible ?? false);
  const [showInHeader, setShowInHeader] = useState(page?.showInHeader ?? false);
  const [ctaHref, setCtaHref] = useState(page?.ctaHref ?? "/#agenda");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(page?.heroImageUrl ?? null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    const body: Record<string, string | boolean | null> = {
      visible,
      showInHeader,
      ctaHref,
      heroImageUrl,
    };
    for (const key of [
      "headerLabel",
      "pageTitle",
      "pageEyebrow",
      "name",
      "tagline",
      "bio",
      "propuesta",
      "ctaLabel",
    ]) {
      const val = (fd.get(key) as string | null)?.trim() ?? "";
      body[key] = val === "" ? null : val;
    }

    // required-with-default fields can't be null; restore defaults
    if (body.headerLabel === null) body.headerLabel = "Sobre mí";
    if (body.pageTitle === null) body.pageTitle = "Sobre mí";
    if (body.ctaLabel === null) body.ctaLabel = "Agenda tu primera clase";

    startTransition(async () => {
      const res = await fetch("/api/panel/about-page", {
        method: "PUT",
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
      {/* Visibility toggles */}
      <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-1">Visibilidad</legend>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-text)]">
            Página pública visible en <span className="font-mono">/sobre</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showInHeader}
            onChange={(e) => setShowInHeader(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-text)]">
            Mostrar link en el header del sitio
          </span>
        </label>

        <div>
          <label htmlFor="about-headerLabel" className={labelCls}>
            Label del link en header
          </label>
          <input
            id="about-headerLabel"
            name="headerLabel"
            defaultValue={page?.headerLabel ?? "Sobre mí"}
            className={inputCls}
            maxLength={50}
          />
        </div>
      </fieldset>

      {/* Hero */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">Hero</legend>
        <div>
          <label htmlFor="about-pageEyebrow" className={labelCls}>
            Cintillo (opcional — ej: &ldquo;Sobre mí&rdquo;)
          </label>
          <input
            id="about-pageEyebrow"
            name="pageEyebrow"
            defaultValue={page?.pageEyebrow ?? ""}
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label htmlFor="about-name" className={labelCls}>
            Nombre (ej: &ldquo;Trinidad&rdquo;)
          </label>
          <input
            id="about-name"
            name="name"
            defaultValue={page?.name ?? ""}
            className={inputCls}
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="about-tagline" className={labelCls}>
            Tagline corto
          </label>
          <textarea
            id="about-tagline"
            name="tagline"
            rows={2}
            defaultValue={page?.tagline ?? ""}
            className={inputCls}
            maxLength={280}
          />
        </div>
        <div>
          <label className={labelCls}>Foto hero (vertical 3:4 recomendado)</label>
          <SanityImagePicker
            value={heroImageUrl}
            onChange={setHeroImageUrl}
            label="Foto hero Sobre mí"
            aspect="portrait"
          />
        </div>
      </fieldset>

      {/* Title (browser tab + page internal) */}
      <div>
        <label htmlFor="about-pageTitle" className={labelCls}>
          Título de la página (tab del navegador)
        </label>
        <input
          id="about-pageTitle"
          name="pageTitle"
          defaultValue={page?.pageTitle ?? "Sobre mí"}
          className={inputCls}
          maxLength={120}
        />
      </div>

      {/* Bio + Propuesta */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-2">Textos</legend>
        <div>
          <label htmlFor="about-bio" className={labelCls}>
            Mi historia (admite saltos de línea; párrafos con línea en blanco)
          </label>
          <textarea
            id="about-bio"
            name="bio"
            rows={10}
            defaultValue={page?.bio ?? ""}
            className={`${inputCls} font-sans`}
            maxLength={10000}
          />
        </div>
        <div>
          <label htmlFor="about-propuesta" className={labelCls}>
            Mi propuesta (opcional)
          </label>
          <textarea
            id="about-propuesta"
            name="propuesta"
            rows={8}
            defaultValue={page?.propuesta ?? ""}
            className={`${inputCls} font-sans`}
            maxLength={10000}
          />
        </div>
      </fieldset>

      {/* CTA */}
      <fieldset className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <legend className="text-sm font-semibold text-[var(--color-text)] mb-1">CTA final</legend>
        <div>
          <label htmlFor="about-ctaLabel" className={labelCls}>
            Texto del botón
          </label>
          <input
            id="about-ctaLabel"
            name="ctaLabel"
            defaultValue={page?.ctaLabel ?? "Agenda tu primera clase"}
            className={inputCls}
            maxLength={80}
          />
        </div>
        <div>
          <label htmlFor="about-ctaHref" className={labelCls}>
            Link del botón
          </label>
          <input
            id="about-ctaHref"
            name="ctaHref"
            value={ctaHref}
            onChange={(e) => setCtaHref(e.target.value)}
            className={inputCls}
            placeholder="/#agenda  ·  /planes  ·  https://..."
          />
          <div className="mt-1">
            <SiteLinkPicker onPick={(href) => setCtaHref(href)} />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      {success && <p className="text-xs text-green-600">Cambios guardados</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
