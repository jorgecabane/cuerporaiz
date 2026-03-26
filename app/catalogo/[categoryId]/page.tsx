import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoryId: string }>;
}

export default async function CatalogoCategoryPage({ params }: Props) {
  const { categoryId } = await params;

  const category = await onDemandCategoryRepository.findById(categoryId);
  if (!category || category.status !== "PUBLISHED") notFound();

  const practices = await onDemandPracticeRepository.findPublishedByCategoryId(category.id);
  const practicesWithCounts = await Promise.all(
    practices.map(async (p) => {
      const lessons = await onDemandLessonRepository.findPublishedByPracticeId(p.id);
      return { ...p, lessonCount: lessons.length };
    }),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <nav className="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
        <Link href="/catalogo" className="hover:text-[var(--color-text)]">
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{category.name}</span>
      </nav>

      <div>
        {category.thumbnailUrl && (
          <img
            src={category.thumbnailUrl}
            alt={category.name}
            className="w-full h-56 object-cover rounded-[var(--radius-lg)] mb-6"
          />
        )}
        <h1 className="text-3xl font-semibold text-[var(--color-text)]">{category.name}</h1>
        {category.description && (
          <p className="text-[var(--color-text-muted)] mt-2">{category.description}</p>
        )}
      </div>

      {practicesWithCounts.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">Aún no hay prácticas disponibles.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {practicesWithCounts.map((practice) => (
            <Link
              key={practice.id}
              href={`/catalogo/${category.id}/${practice.id}`}
              className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:shadow-md transition-shadow"
            >
              {practice.thumbnailUrl && (
                <img
                  src={practice.thumbnailUrl}
                  alt={practice.name}
                  className="w-full h-40 object-cover"
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

      <div className="text-center pt-4">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          Inicia sesión para desbloquear
        </Link>
      </div>
    </div>
  );
}
