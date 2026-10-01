"use client";

import { useState } from "react";
import Link from "next/link";
import type { SiteConfig } from "@/lib/domain/site-config";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";
import { usePatchSiteConfig } from "./usePatchSiteConfig";
import { NAV_GROUP_LABELS } from "@/lib/domain/public-nav";

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";
const labelCls = "block text-xs font-medium text-[var(--color-text)] mb-1";
const helpCls = "mt-1 text-xs text-[var(--color-text-muted)]";

const TEXT_FIELDS = ["visitTitle", "visitIntro", "visitVideoUrl", "visitParking", "visitTransit"] as const;

/** Página pública /conocenos. Las fotos salen de Sobre mí → galería "La sala". */
export default function VisitPageForm({ config }: { config: SiteConfig | null }) {
  const { save, isPending, error, success } = usePatchSiteConfig();
  const [visible, setVisible] = useState(config?.visitVisible ?? false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(config?.visitHeroImageUrl ?? null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { visitVisible: visible, visitHeroImageUrl: heroImageUrl };
    for (const key of TEXT_FIELDS) body[key] = (fd.get(key) as string)?.trim() || null;
    save(body);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--color-text)]">Página visible y en el menú ({NAV_GROUP_LABELS.about} → Conócenos)</span>
      </label>

      <div>
        <label htmlFor="visit-title" className={labelCls}>Título</label>
        <input id="visit-title" name="visitTitle" maxLength={120} defaultValue={config?.visitTitle ?? ""} placeholder="Conócenos" className={inputCls} />
      </div>
      <div>
        <label htmlFor="visit-intro" className={labelCls}>Bajada</label>
        <textarea id="visit-intro" name="visitIntro" rows={3} maxLength={600} defaultValue={config?.visitIntro ?? ""} className={inputCls} />
      </div>
      <div>
        <span className={labelCls}>Foto de portada</span>
        <SanityImagePicker value={heroImageUrl} onChange={setHeroImageUrl} label="Portada de Conócenos" aspect="wide" imageKind="hero" />
        <p className={helpCls}>Si la dejas vacía, se usa la primera foto de “La sala”.</p>
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--color-tertiary)] p-3 text-xs text-[var(--color-text)]">
        Las fotos del espacio se administran en{" "}
        <Link href="/panel/sitio?tab=sobre" className="font-medium text-[var(--color-primary)] underline">
          Sobre mí → Galería → “La sala”
        </Link>{" "}
        (subir, ordenar u ocultar). Lo que pongas en <strong>Primera clase</strong> aparece aquí como “Qué esperar”.
      </div>

      <div>
        <label htmlFor="visit-video" className={labelCls}>Video mini tour (YouTube o Vimeo)</label>
        <input id="visit-video" name="visitVideoUrl" type="url" defaultValue={config?.visitVideoUrl ?? ""} placeholder="https://youtube.com/watch?v=…" className={inputCls} aria-describedby="visit-video-help" />
        <p id="visit-video-help" className={helpCls}>Opcional. Sin link, el bloque no aparece.</p>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-[var(--color-text)]">Cómo llegar</legend>
        <p className={helpCls}>La dirección y el mapa salen de la pestaña Contacto.</p>
        <div>
          <label htmlFor="visit-parking" className={labelCls}>Estacionamiento</label>
          <input id="visit-parking" name="visitParking" maxLength={200} defaultValue={config?.visitParking ?? ""} className={inputCls} />
        </div>
        <div>
          <label htmlFor="visit-transit" className={labelCls}>Transporte público</label>
          <input id="visit-transit" name="visitTransit" maxLength={200} defaultValue={config?.visitTransit ?? ""} className={inputCls} />
        </div>
      </fieldset>

      <SaveRow isPending={isPending} error={error} success={success} previewHref={visible ? "/conocenos" : undefined} />
    </form>
  );
}

export function SaveRow({ isPending, error, success, previewHref }: { isPending: boolean; error: string | null; success: boolean; previewHref?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar"}
      </button>
      {success && <span role="status" className="text-sm text-[var(--color-success)]">Guardado ✓</span>}
      {success && previewHref && (
        <a href={previewHref} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] underline">
          Ver página
        </a>
      )}
      {error && <span role="alert" className="text-sm text-[var(--color-error)]">{error}</span>}
    </div>
  );
}
