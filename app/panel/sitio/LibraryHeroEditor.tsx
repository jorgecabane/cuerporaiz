"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";
import type { SiteConfig } from "@/lib/domain/site-config";

interface LibraryHeroEditorProps {
  config: SiteConfig | null;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";

const DEFAULT_TITLE = "Una biblioteca que crece contigo";
const DEFAULT_DESCRIPTION = "Más de 50 clases grabadas. Nuevo contenido cada mes.";

/**
 * Editor de la tarjeta hero de la sección Biblioteca virtual del home (item 8).
 * Vive dentro del tab "Secciones" de /panel/sitio, expandiendo la fila on-demand.
 * Persiste en CenterSiteConfig (libraryHeroTitle, libraryHeroDescription,
 * libraryHeroImageUrl) — patrón consistente con el hero principal.
 *
 * El título/subtítulo de la sección on-demand se siguen editando con el lápiz
 * estándar (igual que el resto de las secciones), no acá.
 */
export default function LibraryHeroEditor({ config }: LibraryHeroEditorProps) {
  const [title, setTitle] = useState(config?.libraryHeroTitle ?? "");
  const [description, setDescription] = useState(config?.libraryHeroDescription ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(config?.libraryHeroImageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await fetch("/api/panel/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryHeroTitle: title.trim() || null,
          libraryHeroDescription: description.trim() || null,
          libraryHeroImageUrl: imageUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Tarjeta hero</h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          La tarjeta grande del bento en el home. Vacío usa el default del sitio.
        </p>
      </div>

      <div>
        <label htmlFor="lib-hero-title" className={labelCls}>
          Título
        </label>
        <input
          id="lib-hero-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={DEFAULT_TITLE}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="lib-hero-description" className={labelCls}>
          Descripción
        </label>
        <textarea
          id="lib-hero-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder={DEFAULT_DESCRIPTION}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Imagen de fondo</label>
        <SanityImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          label="Imagen del hero biblioteca"
          aspect="wide"
          imageKind="hero"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Recomendado: 1200×900px, formato horizontal.
        </p>
      </div>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      {success && <p className="text-xs text-green-600">Cambios guardados</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
