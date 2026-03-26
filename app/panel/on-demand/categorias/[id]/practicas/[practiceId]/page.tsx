import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import Link from "next/link";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";
import { PracticeEditForm } from "@/components/panel/on-demand/PracticeEditForm";

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string; practiceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");

  const { id: categoryId, practiceId } = await params;

  const [category, practice] = await Promise.all([
    onDemandCategoryRepository.findById(categoryId),
    onDemandPracticeRepository.findById(practiceId),
  ]);

  if (!category || category.centerId !== session.user.centerId) {
    redirect("/panel/on-demand/categorias");
  }
  if (!practice || practice.categoryId !== categoryId) {
    redirect(`/panel/on-demand/categorias/${categoryId}`);
  }

  const lessons = await onDemandLessonRepository.findByPracticeId(practiceId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/panel/on-demand/categorias" className="hover:text-[var(--color-text)]">
          Categorías
        </Link>
        <span>/</span>
        <Link
          href={`/panel/on-demand/categorias/${categoryId}`}
          className="hover:text-[var(--color-text)]"
        >
          {category.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{practice.name}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
          {practice.name}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            practice.status === "PUBLISHED"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {CONTENT_STATUS_LABELS[practice.status]}
        </span>
      </div>

      <div className="mb-8">
        <PracticeEditForm practice={practice} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Lecciones</h2>
        <Link
          href={`/panel/on-demand/lecciones/nueva?practiceId=${practiceId}`}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          Nueva lección
        </Link>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay lecciones. Crea una desde &quot;Nueva lección&quot;.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/panel/on-demand/lecciones/${lesson.id}/editar`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
              >
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{lesson.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {lesson.durationMinutes != null ? `${lesson.durationMinutes} min` : "—"}
                    {lesson.level ? ` · ${lesson.level}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    lesson.status === "PUBLISHED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {CONTENT_STATUS_LABELS[lesson.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
