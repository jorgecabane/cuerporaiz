import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { planRepository, userPlanRepository } from "@/lib/adapters/db";
import { MisPlansTabs } from "@/app/planes/MisPlansTabs";
import type { MisPlanItem } from "@/app/planes/MisPlansTabs";
import { TiendaPlans } from "./TiendaPlans";
import type { SerializedPlan } from "./TiendaPlans";

export default async function TiendaPage() {
  const session = await auth();
  if (!session?.user?.centerId) {
    redirect("/auth/login?callbackUrl=/panel/tienda");
  }
  const centerId = session.user.centerId;
  const userId = session.user.id;

  const [plans, userPlans] = await Promise.all([
    planRepository.findManyByCenterId(centerId),
    userPlanRepository.findByUserAndCenter(userId, centerId),
  ]);

  const planMap = new Map(plans.map((p) => [p.id, p]));
  const missingPlanIds = [...new Set(userPlans.map((up) => up.planId))].filter(
    (id) => !planMap.has(id)
  );
  if (missingPlanIds.length > 0) {
    const missing = await planRepository.findManyByIds(missingPlanIds);
    for (const p of missing) planMap.set(p.id, p);
  }

  const misPlansItems: MisPlanItem[] = userPlans.map((up) => ({
    id: up.id,
    planId: up.planId,
    planName: planMap.get(up.planId)?.name ?? "Plan",
    status: up.status,
    isRecurring: !!up.subscriptionId,
    classesTotal: up.classesTotal,
    classesUsed: up.classesUsed,
    validFrom: up.validFrom.toISOString(),
    validUntil: up.validUntil?.toISOString() ?? null,
  }));

  const serializedPlans: SerializedPlan[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    amountCents: p.amountCents,
    currency: p.currency,
    type: p.type,
    validityDays: p.validityDays,
    validityPeriod: p.validityPeriod,
    billingMode: p.billingMode,
    recurringDiscountPercent: p.recurringDiscountPercent,
    maxReservations: p.maxReservations,
    maxReservationsPerDay: p.maxReservationsPerDay,
    maxReservationsPerWeek: p.maxReservationsPerWeek,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--space-4)] py-[var(--space-8)] md:py-[var(--space-12)]">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Planes
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Gestiona tus membresías y compra nuevos planes.
      </p>

      <div className="mb-12">
        <MisPlansTabs items={misPlansItems} />
      </div>

      <section aria-labelledby="planes-disponibles-heading">
        <h2
          id="planes-disponibles-heading"
          className="font-display text-xl font-semibold text-[var(--color-primary)] mb-6"
        >
          Planes disponibles
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 border border-[var(--color-border)] animate-fade-in">
            <p className="text-[var(--color-text-muted)]">
              Este centro aún no tiene planes publicados.
            </p>
            <Button href="/panel" variant="secondary" className="mt-4">
              Volver al panel
            </Button>
          </div>
        ) : (
          <Suspense fallback={null}>
            <TiendaPlans plans={serializedPlans} />
          </Suspense>
        )}
      </section>

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
