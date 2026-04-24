import type { Metadata } from "next";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSiteMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoryId: string; practiceId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryId, practiceId } = await params;
  const practice = await onDemandPracticeRepository.findById(practiceId);
  const path = `/catalogo/${categoryId}/${practiceId}`;
  if (
    !practice ||
    practice.status !== "PUBLISHED" ||
    practice.categoryId !== categoryId
  ) {
    return buildSiteMetadata({ path, noIndex: true });
  }
  return buildSiteMetadata({
    path,
    title: `${practice.name} — Práctica on demand`,
    description: practice.description ?? undefined,
    image: practice.thumbnailUrl,
  });
}

export default async function CatalogoPracticePage({ params }: Props) {
  const { categoryId, practiceId } = await params;

  const [category, practice] = await Promise.all([
    onDemandCategoryRepository.findById(categoryId),
    onDemandPracticeRepository.findById(practiceId),
  ]);

  if (!category || category.status !== "PUBLISHED") notFound();
  if (!practice || practice.status !== "PUBLISHED" || practice.categoryId !== category.id) {
    notFound();
  }

  const lessons = await onDemandLessonRepository.findPublishedByPracticeId(practice.id);
  // Strip videoUrl for public catalog — only expose promoVideoUrl
  const publicLessons = lessons.map(({ videoUrl: _videoUrl, ...rest }) => rest);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <nav className="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
        <Link href="/catalogo" className="hover:text-[var(--color-text)] transition-colors">
          Catálogo
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <Link href={`/catalogo/${category.id}`} className="hover:text-[var(--color-text)] transition-colors">
          {category.name}
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-[var(--color-text)]">{practice.name}</span>
      </nav>

      <div>
        {practice.thumbnailUrl && (
          <img
            src={practice.thumbnailUrl}
            alt={practice.name}
            loading="lazy"
            className="w-full h-56 object-cover rounded-[var(--radius-lg)] mb-6"
          />
        )}
        <h1 className="text-3xl font-semibold text-[var(--color-text)]">{practice.name}</h1>
        {practice.description && (
          <p className="text-[var(--color-text-muted)] mt-2">{practice.description}</p>
        )}
      </div>

      {publicLessons.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">Aún no hay clases disponibles.</p>
      ) : (
        <ul className="space-y-4">
          {publicLessons.map((lesson) => (
            <li
              key={lesson.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                {lesson.thumbnailUrl && (
                  <img
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    loading="lazy"
                    className="w-24 h-16 object-cover rounded-[var(--radius-md)] flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--color-text)]">{lesson.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                    {lesson.durationMinutes && <span>{lesson.durationMinutes} min</span>}
                    {lesson.level && <span>{lesson.level}</span>}
                    {lesson.intensity && <span>{lesson.intensity}</span>}
                    {lesson.equipment && <span>Equipo: {lesson.equipment}</span>}
                  </div>
                  {lesson.promoVideoUrl && (
                    <a
                      href={lesson.promoVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-[var(--color-primary)] hover:underline"
                    >
                      Ver adelanto →
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="text-center pt-4">
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
