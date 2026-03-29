"use client";

import { useState } from "react";
import { ComprarPlanButton } from "@/app/planes/ComprarPlanButton";
import SuscribirmeButton from "@/app/planes/SuscribirmeButton";

export type SerializedPlan = {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  type: "LIVE" | "ON_DEMAND" | "MEMBERSHIP_ON_DEMAND";
  validityDays: number | null;
  validityPeriod: string | null;
  billingMode: "ONE_TIME" | "RECURRING" | "BOTH" | null;
  recurringDiscountPercent: number | null;
  maxReservations: number | null;
  maxReservationsPerDay: number | null;
  maxReservationsPerWeek: number | null;
};

const TYPE_LABELS: Record<SerializedPlan["type"], string> = {
  LIVE: "EN VIVO",
  ON_DEMAND: "ON DEMAND",
  MEMBERSHIP_ON_DEMAND: "MEMBRESÍA",
};

const TYPE_DESCRIPTIONS: Record<SerializedPlan["type"], string> = {
  LIVE: "Clases presenciales y online en vivo",
  ON_DEMAND: "Clases grabadas a tu ritmo",
  MEMBERSHIP_ON_DEMAND: "Acceso a todo el contenido grabado",
};

const TYPE_ORDER: SerializedPlan["type"][] = ["LIVE", "ON_DEMAND", "MEMBERSHIP_ON_DEMAND"];

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function recurringPrice(plan: SerializedPlan): number {
  const discount = plan.recurringDiscountPercent ?? 0;
  if (discount <= 0) return plan.amountCents;
  return Math.round(plan.amountCents * (1 - discount / 100));
}

function BillingToggle({
  billing,
  onChange,
  maxDiscount,
}: {
  billing: "one-time" | "monthly";
  onChange: (b: "one-time" | "monthly") => void;
  maxDiscount: number;
}) {
  return (
    <div className="flex justify-center mb-8">
      <div
        className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
        role="radiogroup"
        aria-label="Tipo de pago"
      >
        <button
          type="button"
          role="radio"
          aria-checked={billing === "one-time"}
          onClick={() => onChange("one-time")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-[color,background-color] duration-150 ${
            billing === "one-time"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          Pago único
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={billing === "monthly"}
          onClick={() => onChange("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-[color,background-color] duration-150 flex items-center gap-2 ${
            billing === "monthly"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          Mensual
          {maxDiscount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                billing === "monthly"
                  ? "bg-[var(--color-secondary)] text-white"
                  : "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]"
              }`}
            >
              -{maxDiscount}%
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  billing,
  isPopular,
}: {
  plan: SerializedPlan;
  billing: "one-time" | "monthly";
  isPopular: boolean;
}) {
  const canOneTime = plan.billingMode === "ONE_TIME" || plan.billingMode === "BOTH";
  const canRecurring = plan.billingMode === "RECURRING" || plan.billingMode === "BOTH";
  const hasDiscount = (plan.recurringDiscountPercent ?? 0) > 0;
  const showMonthly = billing === "monthly" && canRecurring;
  const activePrice = showMonthly ? recurringPrice(plan) : plan.amountCents;
  const priceSuffix = showMonthly ? "/mes" : "pago único";
  const showStrikethrough = showMonthly && hasDiscount;

  const features: string[] = [];
  if (plan.maxReservations != null) {
    features.push(`Máx. ${plan.maxReservations} clases en total`);
  } else {
    features.push("Clases ilimitadas");
  }
  if (plan.maxReservationsPerDay != null) {
    features.push(`Máx. ${plan.maxReservationsPerDay} por día`);
  }
  if (plan.maxReservationsPerWeek != null) {
    features.push(`Máx. ${plan.maxReservationsPerWeek} por semana`);
  }
  if (showMonthly) {
    features.push("Se renueva automáticamente");
  } else if (plan.validityDays != null) {
    features.push(`Válido ${plan.validityDays} días`);
  }

  return (
    <li
      className={`rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5 sm:p-6 flex flex-col gap-4 ${
        isPopular
          ? "border-2 border-[var(--color-primary)] shadow-[var(--shadow-md)]"
          : "border border-[var(--color-border)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-[11px] font-medium text-white uppercase tracking-wide">
          {TYPE_LABELS[plan.type]}
        </span>
        {isPopular && (
          <span className="rounded-full bg-[var(--color-secondary)] px-2.5 py-0.5 text-[11px] font-semibold text-white uppercase tracking-wide">
            Popular
          </span>
        )}
      </div>
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-primary)]">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{plan.description}</p>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-[var(--color-primary)]">
            {formatPrice(activePrice, plan.currency)}
          </span>
          <span className="text-sm text-[var(--color-text-muted)]">{priceSuffix}</span>
        </div>
        {showStrikethrough && (
          <p className="text-sm text-[var(--color-text-muted)] line-through mt-0.5">
            {formatPrice(plan.amountCents, plan.currency)} pago único
          </p>
        )}
      </div>
      {features.length > 0 && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-tertiary)] px-4 py-3 space-y-1.5">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span className="text-[var(--color-primary)]">✓</span>
              {f}
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto pt-2">
        {showMonthly ? (
          <SuscribirmeButton
            planId={plan.id}
            recurringDiscountPercent={plan.recurringDiscountPercent ?? undefined}
          />
        ) : (
          <ComprarPlanButton planId={plan.id} planName={plan.name} className="w-full" />
        )}
      </div>
    </li>
  );
}

export function TiendaPlans({ plans }: { plans: SerializedPlan[] }) {
  const [billing, setBilling] = useState<"one-time" | "monthly">("one-time");
  const hasAnyRecurring = plans.some(
    (p) => p.billingMode === "RECURRING" || p.billingMode === "BOTH"
  );
  const maxDiscount = Math.max(0, ...plans.map((p) => p.recurringDiscountPercent ?? 0));
  const groups = TYPE_ORDER
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      description: TYPE_DESCRIPTIONS[type],
      plans: plans.filter((p) => p.type === type),
    }))
    .filter((g) => g.plans.length > 0);

  const livePlans = plans.filter((p) => p.type === "LIVE");
  const popularPlanId = livePlans.length > 0
    ? livePlans.reduce((best, p) =>
        (p.maxReservations ?? Infinity) > (best.maxReservations ?? Infinity) ? p : best
      ).id
    : null;

  return (
    <>
      {hasAnyRecurring && (
        <BillingToggle billing={billing} onChange={setBilling} maxDiscount={maxDiscount} />
      )}
      <div className="space-y-10">
        {groups.map(({ type, label, description, plans: typePlans }) => (
          <div key={type}>
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                {label}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {typePlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} billing={billing} isPopular={plan.id === popularPlanId} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
