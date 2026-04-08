import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { planRepository, onDemandCategoryRepository, planCategoryQuotaRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { Button } from "@/components/ui/Button";
import { PlanFormEdit } from "./PlanFormEdit";

export default async function PanelPlanesEditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/planes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const { id } = await params;
  const { error } = await searchParams;
  const plan = await planRepository.findById(id);
  if (!plan || plan.centerId !== centerId) notFound();

  const [categories, existingQuotas] = await Promise.all([
    onDemandCategoryRepository.findByCenterId(centerId),
    planCategoryQuotaRepository.findByPlanId(plan.id),
  ]);

  const initialQuotas = existingQuotas.map((q) => ({
    categoryId: q.categoryId,
    maxLessons: q.maxLessons,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Editar plan
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Modifica los datos del plan.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <PlanFormEdit
          plan={plan}
          slugError={error === "slug"}
          categories={categories}
          initialQuotas={initialQuotas}
        />
      </div>
      <div className="mt-6">
        <Button href="/panel/planes" variant="secondary">
          Volver a planes
        </Button>
      </div>
    </div>
  );
}
