import { onDemandCategoryRepository, onDemandPracticeRepository } from "@/lib/adapters/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoryId: string }>;
}

export default async function CatalogoCategoryPage({ params }: Props) {
  const { categoryId } = await params;

  const [category, practicesWithLessons] = await Promise.all([
    onDemandCategoryRepository.findById(categoryId),
    onDemandPracticeRepository.findPublishedWithLessonsByCategoryId(categoryId),
  ]);
  if (!category || category.status !== "PUBLISHED") notFound();

  const practicesWithCounts = practicesWithLessons.map((p) => ({
    ...p,
    lessonCount: p.lessons.length,
  }));

  return (
    <>
      {/* Page header with breadcrumb */}
      <div className="pt-[calc(var(--header-height)+var(--space-8))] pb-[var(--space-6)] px-[var(--space-4)] md:px-[var(--space-8)]">
        <div className="mx-auto max-w-4xl">
          <nav className="text-sm flex items-center gap-2 mb-4">
            <Link href="/catalogo" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
              Catálogo
            </Link>
            <span className="text-[var(--color-border)]">/</span>
            <span className="text-[var(--color-text)]">{category.name}</span>
          </nav>
          <h1 className="text-section font-display font-semibold text-[var(--color-primary)]">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-base text-[var(--color-text-muted)] mt-2 max-w-lg">{category.description}</p>
          )}
        </div>
      </div>

      {/* Practice cards */}
      <div className="mx-auto max-w-4xl px-[var(--space-4)] md:px-[var(--space-8)] py-[var(--space-10)]">
        {practicesWithCounts.length === 0 ? (
          <p className="text-[var(--color-text-muted)] animate-fade-in">
            Aún no hay prácticas disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {practicesWithCounts.map((practice) => (
              <Link
                key={practice.id}
                href={`/catalogo/${category.id}/${practice.id}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow"
              >
                {practice.thumbnailUrl && (
                  <img
                    src={practice.thumbnailUrl}
                    alt={practice.name}
                    loading="lazy"
                    className="w-full h-40 object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                )}
                <div className="p-4">
                  <h2 className="text-lg font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                    {practice.name}
                  </h2>
                  {practice.description && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {practice.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    {practice.lessonCount} {practice.lessonCount === 1 ? "clase" : "clases"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center pt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Inicia sesión para desbloquear
          </Link>
        </div>
      </div>
    </>
  );
}
