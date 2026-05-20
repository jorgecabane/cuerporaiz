import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandCategoryRepository,
  onDemandLessonRepository,
  onDemandPracticeRepository,
  lessonUnlockRepository,
} from "@/lib/adapters/db";
import { LessonForm } from "@/components/panel/on-demand/LessonForm";
import { OnDemandBreadcrumb } from "@/components/panel/on-demand/OnDemandBreadcrumb";

export default async function EditarLeccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId!;
  const { id } = await params;

  const lesson = await onDemandLessonRepository.findById(id);
  if (!lesson) notFound();

  // Verifica que la lección pertenezca al centro del admin (vía practice → category).
  // Sin este check, un admin podía abrir la pantalla de edición de lecciones de
  // otros centros y leer videoUrl/metadata aunque las mutaciones ya quedaron blindadas.
  const categories = await onDemandCategoryRepository.findByCenterId(centerId);
  const practicesPerCategory = await Promise.all(
    categories.map((cat) => onDemandPracticeRepository.findByCategoryId(cat.id))
  );
  const practices = practicesPerCategory.flat();
  const practice = practices.find((p) => p.id === lesson.practiceId) ?? null;
  if (!practice) notFound();
  const category = categories.find((c) => c.id === practice.categoryId) ?? null;
  if (!category) notFound();

  const unlockCount = await lessonUnlockRepository.countByLessonId(lesson.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <OnDemandBreadcrumb
        segments={[
          { label: "Categorías", href: "/panel/on-demand/categorias" },
          ...(category
            ? [{ label: category.name, href: `/panel/on-demand/categorias/${category.id}` }]
            : []),
          ...(practice && category
            ? [
                {
                  label: practice.name,
                  href: `/panel/on-demand/categorias/${category.id}/practicas/${practice.id}`,
                },
              ]
            : []),
          { label: lesson.title },
        ]}
      />

      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Editar lección
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Modifica los datos de esta lección.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <LessonForm
          categories={categories}
          practices={practices}
          lesson={lesson}
          unlockCount={unlockCount}
        />
      </div>
    </div>
  );
}
