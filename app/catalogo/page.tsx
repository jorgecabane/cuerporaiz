import { onDemandCategoryRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import Link from "next/link";

export const revalidate = 300; // 5 min ISR

export default async function CatalogoPage() {
  const center = await prisma.center.findFirst();
  if (!center) return <p className="p-8 text-[var(--color-text-muted)]">Centro no configurado.</p>;

  const categoriesTree = await onDemandCategoryRepository.findPublishedTreeByCenterId(center.id);
  const categoriesWithCounts = categoriesTree.map((cat) => ({
    ...cat,
    practiceCount: cat.practices.length,
    lessonCount: cat.practices.reduce((acc, p) => acc + p.lessons.length, 0),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-semibold text-[var(--color-text)]">Catálogo on demand</h1>
      <p className="text-[var(--color-text-muted)]">
        Explora nuestras clases grabadas. Compra un plan para desbloquear y ver las clases.
      </p>

      {categoriesWithCounts.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">Aún no hay contenido disponible.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {categoriesWithCounts.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogo/${cat.id}`}
              className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:shadow-md transition-shadow"
            >
              {cat.thumbnailUrl && (
                <img src={cat.thumbnailUrl} alt={cat.name} loading="lazy" className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h2 className="text-lg font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">{cat.description}</p>
                )}
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  {cat.practiceCount} prácticas · {cat.lessonCount} clases
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center pt-8">
        <Link
          href="/panel/tienda"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          Compra un plan para acceder
        </Link>
      </div>
    </div>
  );
}
