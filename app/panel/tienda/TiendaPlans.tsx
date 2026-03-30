"use client";

import { useState } from "react";
import { ComprarPlanButton } from "@/app/planes/ComprarPlanButton";
import SuscribirmeButton from "@/app/planes/SuscribirmeButton";

/* ─── Types ──────────────────────────────────────────────────────────────── */

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

/* ─── Constants ──────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<SerializedPlan["type"], string> = {
  LIVE: "En vivo",
  ON_DEMAND: "On demand",
  MEMBERSHIP_ON_DEMAND: "Membresía",
};

const TYPE_ORDER: SerializedPlan["type"][] = ["LIVE", "ON_DEMAND", "MEMBERSHIP_ON_DEMAND"];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function recurringPrice(plan: SerializedPlan): number {
  const discount = plan.recurringDiscountPercent ?? 0;
  if (discount <= 0) return plan.amountCents;
  return Math.round(plan.amountCents * (1 - discount / 100));
}

/* ─── Filter Chips ───────────────────────────────────────────────────────── */

function FilterChips({
  types,
  activeTypes,
  onToggle,
}: {
  types: SerializedPlan["type"][];
  activeTypes: Set<SerializedPlan["type"]>;
  onToggle: (type: SerializedPlan["type"]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar por tipo">
      {types.map((type) => {
        const isActive = activeTypes.has(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(type)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-[color,background-color,border-color] duration-150 ${
              isActive
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
            }`}
          >
            {TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Plan Card ──────────────────────────────────────────────────────────── */

function PlanCard({
  plan,
  isPopular,
}: {
  plan: SerializedPlan;
  isPopular: boolean;
}) {
  const canBoth = plan.billingMode === "BOTH";
  const canOneTime = plan.billingMode === "ONE_TIME" || canBoth;
  const canRecurring = plan.billingMode === "RECURRING" || canBoth;
  const hasDiscount = (plan.recurringDiscountPercent ?? 0) > 0;
  const recPrice = recurringPrice(plan);

  // Per-card billing state (only for BOTH plans)
  const [cardBilling, setCardBilling] = useState<"one-time" | "monthly">("one-time");
  const showMonthly = canBoth ? cardBilling === "monthly" : canRecurring;
  const activePrice = showMonthly ? recPrice : plan.amountCents;
  const priceSuffix = showMonthly ? "/mes" : "pago único";

  // Features
  const features: string[] = [];
  if (plan.maxReservations != null) {
    features.push(`Máx. ${plan.maxReservations} clases`);
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
      {/* Badges */}
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

      {/* Name + description */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-primary)]">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{plan.description}</p>
        )}
      </div>

      {/* Per-card billing toggle (only for BOTH plans) */}
      {canBoth && (
        <div className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-tertiary)] p-1 self-start">
          <button
            type="button"
            onClick={() => setCardBilling("one-time")}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-[color,background-color] duration-150 ${
              cardBilling === "one-time"
                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {formatPrice(plan.amountCents, plan.currency)}
          </button>
          <button
            type="button"
            onClick={() => setCardBilling("monthly")}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-[color,background-color] duration-150 flex items-center gap-1 ${
              cardBilling === "monthly"
                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {formatPrice(recPrice, plan.currency)}/m
            {hasDiscount && (
              <span className="text-[var(--color-secondary)] text-[10px] font-semibold">
                -{plan.recurringDiscountPercent}%
              </span>
            )}
          </button>
        </div>
      )}

      {/* Price (for non-BOTH plans, or as active display) */}
      {!canBoth && (
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[var(--color-primary)]">
              {formatPrice(activePrice, plan.currency)}
            </span>
            <span className="text-sm text-[var(--color-text-muted)]">{priceSuffix}</span>
          </div>
        </div>
      )}

      {/* Features */}
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

      {/* CTA */}
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

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function TiendaPlans({ plans }: { plans: SerializedPlan[] }) {
  // Determine which types exist
  const availableTypes = TYPE_ORDER.filter((type) =>
    plans.some((p) => p.type === type)
  );

  // All types active by default
  const [activeTypes, setActiveTypes] = useState<Set<SerializedPlan["type"]>>(
    () => new Set(availableTypes)
  );

  const toggleType = (type: SerializedPlan["type"]) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Filter plans by active types
  const filteredPlans = plans.filter((p) => activeTypes.has(p.type));

  // Popular plan (most generous LIVE plan)
  const livePlans = plans.filter((p) => p.type === "LIVE");
  const popularPlanId = livePlans.length > 0
    ? livePlans.reduce((best, p) =>
        (p.maxReservations ?? Infinity) > (best.maxReservations ?? Infinity) ? p : best
      ).id
    : null;

  return (
    <>
      {/* Filter chips (only show if more than 1 type) */}
      {availableTypes.length > 1 && (
        <FilterChips
          types={availableTypes}
          activeTypes={activeTypes}
          onToggle={toggleType}
        />
      )}

      {/* Plan cards grid */}
      <ul className="grid gap-4 sm:grid-cols-2">
        {filteredPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isPopular={plan.id === popularPlanId}
          />
        ))}
      </ul>
    </>
  );
}
