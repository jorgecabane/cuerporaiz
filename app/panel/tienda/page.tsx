import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Plan, ValidityPeriod, PlanType, BillingMode } from "@/lib/ports";
import { planRepository, userPlanRepository } from "@/lib/adapters/db";
import { ComprarPlanButton } from "@/app/planes/ComprarPlanButton";
import SuscribirmeButton from "@/app/planes/SuscribirmeButton";
import { MisPlansTabs } from "@/app/planes/MisPlansTabs";
import type { MisPlanItem } from "@/app/planes/MisPlansTabs";

const VALIDITY_PERIOD_LABELS: Record<ValidityPeriod, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  QUADRIMESTRAL: "Cuatrimestral",
  SEMESTER: "Semestral",
  ANNUAL: "Anual",
};

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  LIVE: "En vivo",
  ON_DEMAND: "Grabado",
  MEMBERSHIP_ON_DEMAND: "Membresía",
};

const PLAN_TYPE_ORDER: PlanType[] = ["LIVE", "ON_DEMAND", "MEMBERSHIP_ON_DEMAND"];

const BILLING_MODE_LABELS: Record<NonNullable<BillingMode>, string> = {
  ONE_TIME: "Pago único",
  RECURRING: "Recurrente",
  BOTH: "Pago único o Recurrente",
};

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

function PlanDetail({ plan }: { plan: Plan }) {
  const parts: string[] = [];
  if (plan.validityDays != null) {
    parts.push(`Válido por ${plan.validityDays} días`);
  } else if (plan.validityPeriod != null) {
    parts.push(`Período ${VALIDITY_PERIOD_LABELS[plan.validityPeriod]}`);
  } else if (
    plan.validityDays == null &&
    plan.validityPeriod == null &&
    plan.maxReservations == null &&
    plan.maxReservationsPerDay == null &&
    plan.maxReservationsPerWeek == null
  ) {
    parts.push("Sin vencimiento");
  }
  if (plan.maxReservations != null) {
    parts.push(`Máx. ${plan.maxReservations} clases en total`);
  } else {
    parts.push("Clases ilimitadas");
  }
  if (plan.maxReservationsPerDay != null) {
    parts.push(`Máx. ${plan.maxReservationsPerDay} por día`);
  }
  if (plan.maxReservationsPerWeek != null) {
    parts.push(`Máx. ${plan.maxReservationsPerWeek} por semana`);
  }
  if (parts.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
      {parts.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

function recurringPriceCents(plan: Plan): number | null {
  if (plan.billingMode !== "RECURRING" && plan.billingMode !== "BOTH") return null;
  const discount = plan.recurringDiscountPercent ?? 0;
  if (discount <= 0) return plan.amountCents;
  return Math.round(plan.amountCents * (1 - discount / 100));
}

function PlanCard({ plan }: { plan: Plan }) {
  const canOneTime = plan.billingMode === "ONE_TIME" || plan.billingMode === "BOTH";
  const canRecurring = plan.billingMode === "RECURRING" || plan.billingMode === "BOTH";
  const recurringCents = recurringPriceCents(plan);
  const hasDiscount = canRecurring && (plan.recurringDiscountPercent ?? 0) > 0;

  return (
    <li className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-[var(--shadow-md)] border border-[var(--color-border)] flex flex-col gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[var(--color-text)]">{plan.name}</h3>
          {plan.billingMode && (
            <span className="rounded-full bg-[var(--color-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
              {BILLING_MODE_LABELS[plan.billingMode]}
            </span>
          )}
        </div>
        {plan.description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {plan.description}
          </p>
        )}
        <div className="mt-2 space-y-0.5">
          {canOneTime && (
            <p className="font-medium text-[var(--color-primary)]">
              {formatPrice(plan.amountCents, plan.currency)}
              {plan.billingMode === "BOTH" && " (pago único)"}
            </p>
          )}
          {canRecurring && recurringCents != null && (
            <p className={canOneTime ? "text-sm text-[var(--color-text-muted)]" : "font-medium text-[var(--color-primary)]"}>
              {canOneTime && "Recurrente: "}
              {formatPrice(recurringCents, plan.currency)}
              {hasDiscount && (
                <span className="ml-1 text-[var(--color-success)]">
                  (—{plan.recurringDiscountPercent}%)
                </span>
              )}
            </p>
          )}
        </div>
        <PlanDetail plan={plan} />
      </div>
      <div className="flex flex-wrap gap-2 justify-end w-full">
        {canOneTime && (
          <Suspense fallback={<Button disabled>...</Button>}>
            <ComprarPlanButton
              planId={plan.id}
              planName={plan.name}
              className="w-full sm:w-auto"
            />
          </Suspense>
        )}
        {canRecurring && (
          <SuscribirmeButton
            planId={plan.id}
            recurringDiscountPercent={plan.recurringDiscountPercent ?? undefined}
          />
        )}
      </div>
    </li>
  );
}

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

  const planMap = new Map<string, Plan | null>(plans.map((p) => [p.id, p]));
  const missingPlanIds = [...new Set(userPlans.map((up) => up.planId))].filter(
    (id) => !planMap.has(id)
  );
  if (missingPlanIds.length > 0) {
    const missing = await planRepository.findManyByIds(missingPlanIds);
    const missingMap = new Map(missing.map((p) => [p.id, p]));
    missingPlanIds.forEach((id) => planMap.set(id, missingMap.get(id) ?? null));
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

  const plansByType = PLAN_TYPE_ORDER.map((type) => ({
    type,
    label: PLAN_TYPE_LABELS[type],
    plans: plans.filter((p) => p.type === type),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--space-4)] py-[var(--space-8)] md:py-[var(--space-12)]">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Planes
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Gestiona tus membresías y compra nuevos planes con Mercado Pago.
      </p>

      {/* Mis planes con pestañas Activos / Históricos */}
      <div className="mb-12">
        <MisPlansTabs items={misPlansItems} />
      </div>

      {/* Planes para comprar por tipo */}
      <section
        className="mb-12"
        aria-labelledby="planes-disponibles-heading"
      >
        <h2
          id="planes-disponibles-heading"
          className="font-display text-xl font-semibold text-[var(--color-primary)] mb-6"
        >
          Planes disponibles
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 border border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)]">
              Este centro aún no tiene planes publicados.
            </p>
            <Button href="/panel" variant="secondary" className="mt-4">
              Volver al panel
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {plansByType.map(
              ({ type, label, plans: typePlans }) =>
                typePlans.length > 0 && (
                  <div key={type}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                      {label}
                    </h3>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {typePlans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                      ))}
                    </ul>
                  </div>
                )
            )}
          </div>
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
