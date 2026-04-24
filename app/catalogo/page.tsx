import type { Metadata } from "next";
import { onDemandCategoryRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { buildSiteMetadata } from "@/lib/seo/metadata";

export const revalidate = 300; // 5 min ISR

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata({
    path: "/catalogo",
    title: "Catálogo de prácticas — Cuerpo Raíz",
    description:
      "Explora nuestras categorías de prácticas de yoga on demand: clases grabadas para practicar a tu ritmo, donde y cuando quieras.",
  });
}

export default async function CatalogoPage() {
  const center = await prisma.center.findFirst();
  if (!center) return <p className="p-8 text-[var(--color-text-muted)]">Centro no configurado.</p>;

  const categoriesTree = await onDemandCategoryRepository.findPublishedTreeByCenterId(center.id);
  const categories = categoriesTree.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    practices: cat.practices.map((p) => ({
      id: p.id,
      name: p.name,
      thumbnailUrl: p.thumbnailUrl ?? null,
      lessonCount: p.lessons.length,
      durationRange: p.lessons.length > 0
        ? (() => {
            const durations = p.lessons.map((l) => l.durationMinutes).filter(Boolean) as number[];
            if (durations.length === 0) return null;
            const min = Math.min(...durations);
            const max = Math.max(...durations);
            return min === max ? `${min} min` : `${min}–${max} min`;
          })()
        : null,
    })),
  }));

  const hasContent = categories.length > 0;

  return (
    <>
      {/* Page header with top padding for fixed header */}
      <div className="pt-[calc(var(--header-height)+var(--space-8))] pb-[var(--space-6)] px-[var(--space-4)] md:px-[var(--space-8)]">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-section font-display font-semibold text-[var(--color-primary)]">
            Biblioteca virtual
          </h1>
          <p className="text-base text-[var(--color-text-muted)] mt-2 max-w-lg">
            Practica a tu ritmo con clases grabadas
          </p>
        </div>
      </div>

      {/* Netflix rows */}
      <div className="mx-auto max-w-4xl px-[var(--space-4)] md:px-[var(--space-8)] py-[var(--space-10)] space-y-10">
        {!hasContent ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-8 border border-[var(--color-border)] text-center animate-fade-in">
            <p className="text-[var(--color-text-muted)] mb-4">
              Aún no hay contenido disponible.
            </p>
            <Button href="/panel/tienda" variant="primary">
              Ver planes
            </Button>
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              {/* Row header */}
              <div className="flex items-center justify-between mb-4">
                <h2
                  id={`cat-${cat.id}`}
                  className="text-lg font-semibold text-[var(--color-primary)]"
                >
                  {cat.name}
                </h2>
                <Link
                  href={`/catalogo/${cat.id}`}
                  className="text-sm font-medium text-[var(--color-secondary)] hover:underline"
                >
                  Ver todo →
                </Link>
              </div>

              {/* Horizontal scroll */}
              <div
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
              >
                {cat.practices.map((practice) => (
                  <Link
                    key={practice.id}
                    href={`/catalogo/${cat.id}/${practice.id}`}
                    className="min-w-[160px] sm:min-w-[200px] max-w-[200px] sm:max-w-[240px] shrink-0 snap-start rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow group"
                  >
                    <div className="aspect-[16/10] overflow-hidden">
                      {practice.thumbnailUrl ? (
                        <img
                          src={practice.thumbnailUrl}
                          alt={practice.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
                          }}
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                        {practice.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {practice.lessonCount} {practice.lessonCount === 1 ? "clase" : "clases"}
                        {practice.durationRange && ` · ${practice.durationRange}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
