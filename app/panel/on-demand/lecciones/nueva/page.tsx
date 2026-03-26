import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { onDemandCategoryRepository, onDemandPracticeRepository } from "@/lib/adapters/db";
import { LessonForm } from "@/components/panel/on-demand/LessonForm";
import { Button } from "@/components/ui/Button";

export default async function NuevaLeccionPage({
  searchParams,
}: {
  searchParams: Promise<{ practiceId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/on-demand/lecciones/nueva");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId!;
  const { practiceId } = await searchParams;

  const categories = await onDemandCategoryRepository.findByCenterId(centerId);
  const practicesPerCategory = await Promise.all(
    categories.map((cat) => onDemandPracticeRepository.findByCategoryId(cat.id))
  );
  const practices = practicesPerCategory.flat();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Nueva lección
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Crea una lección de video para el catálogo on-demand.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <LessonForm
          categories={categories}
          practices={practices}
          defaultPracticeId={practiceId}
        />
      </div>
      <div className="mt-6">
        <Button href="/panel/on-demand/categorias" variant="secondary">
          Volver a categorías
        </Button>
      </div>
    </div>
  );
}
