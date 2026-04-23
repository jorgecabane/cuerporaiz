"use client";

import { useMemo, useState } from "react";
import { AnimateIn } from "@/components/ui/AnimateIn";
import {
  ABOUT_IMAGE_CATEGORIES,
  ABOUT_IMAGE_CATEGORY_LABELS,
  type AboutImage,
  type AboutImageCategory,
} from "@/lib/domain/about-page";

type Props = {
  title?: string;
  subtitle?: string;
  images: AboutImage[];
};

export function AboutGallery({ title = "En imágenes", subtitle, images }: Props) {
  const grouped = useMemo(() => {
    const map: Record<AboutImageCategory, AboutImage[]> = {
      RETIROS: [],
      CLASES: [],
      ESPACIO: [],
    };
    for (const img of images) {
      if (img.visible) map[img.category].push(img);
    }
    for (const cat of ABOUT_IMAGE_CATEGORIES) {
      map[cat].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [images]);

  const availableCategories = ABOUT_IMAGE_CATEGORIES.filter(
    (c) => grouped[c].length > 0,
  );

  const [active, setActive] = useState<AboutImageCategory>(
    availableCategories[0] ?? "RETIROS",
  );

  if (availableCategories.length === 0) return null;

  const activeImages = grouped[active];

  return (
    <section
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)] md:py-[var(--space-24)]"
      aria-labelledby="sobre-galeria-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-[var(--space-12)] flex flex-col gap-[var(--space-6)] md:flex-row md:items-end md:justify-between">
          <AnimateIn>
            <div
              aria-hidden
              className="mb-[var(--space-8)] h-[2px] w-12"
              style={{ background: "var(--color-secondary)" }}
            />
            <h2
              id="sobre-galeria-heading"
              className="text-section font-display font-semibold text-[var(--color-primary)]"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-[var(--space-3)] max-w-md text-sm text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            )}
          </AnimateIn>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Categorías"
            className="flex gap-[var(--space-8)] overflow-x-auto text-sm font-medium md:self-end"
          >
            {availableCategories.map((cat) => {
              const selected = cat === active;
              return (
                <button
                  key={cat}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActive(cat)}
                  className={`relative shrink-0 pb-[var(--space-2)] transition-colors ${
                    selected
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {ABOUT_IMAGE_CATEGORY_LABELS[cat]}
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-[2px]"
                      style={{ background: "var(--color-secondary)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          key={active}
          className="grid grid-cols-2 gap-[var(--space-4)] md:grid-cols-3 md:gap-[var(--space-6)]"
        >
          {activeImages.map((img, i) => (
            <figure
              key={img.id}
              className="overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)]"
              style={{
                boxShadow: "var(--shadow-sm)",
                animation: `about-fade-up 400ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) both`,
                animationDelay: `${i * 60}ms`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.caption ?? ""}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover transition-transform duration-[var(--duration-slow)]"
              />
              {img.caption && (
                <figcaption className="px-[var(--space-4)] py-[var(--space-3)] text-xs text-[var(--color-text-muted)]">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes about-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="tabpanel"] figure { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
