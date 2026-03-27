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
import { CategoryEditForm } from "@/components/panel/on-demand/CategoryEditForm";
import { PracticeForm } from "@/components/panel/on-demand/PracticeForm";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");

  const { id } = await params;
  const category = await onDemandCategoryRepository.findById(id);
  if (!category || category.centerId !== session.user.centerId) redirect("/panel/on-demand/categorias");

  const practices = await onDemandPracticeRepository.findByCategoryId(id);

  const lessonCounts = await Promise.all(
    practices.map(async (p) => {
      const lessons = await onDemandLessonRepository.findByPracticeId(p.id);
      return { id: p.id, count: lessons.length };
    })
  );
  const countMap = Object.fromEntries(lessonCounts.map((l) => [l.id, l.count]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-4">
        <Link
          href="/panel/on-demand/categorias"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Categorías
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
          {category.name}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            category.status === "PUBLISHED"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {CONTENT_STATUS_LABELS[category.status]}
        </span>
      </div>

      <div className="mb-8">
        <CategoryEditForm category={category} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Prácticas</h2>
        <PracticeForm categoryId={id} />
      </div>

      {practices.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay prácticas. Crea una desde &quot;Nueva práctica&quot;.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {practices.map((practice) => (
            <li key={practice.id}>
              <Link
                href={`/panel/on-demand/categorias/${id}/practicas/${practice.id}`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
              >
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{practice.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {countMap[practice.id] ?? 0} lecciones
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    practice.status === "PUBLISHED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {CONTENT_STATUS_LABELS[practice.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
