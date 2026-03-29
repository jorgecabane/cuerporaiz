# Tienda + Catálogo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the store page with toggle billing (Stripe-style) and the public catalog with Netflix-style horizontal rows, plus fix the SobreTrini mobile image bug.

**Architecture:** The tienda page gets a new client component (`BillingToggle`) that controls pricing display via React state. The server component passes all plan data as props. The catalog page gets a dark hero header and horizontal scroll rows. Both pages are full rewrites of existing files with no data model changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-29-tienda-catalogo-redesign.md`

---

## File Structure

| File | Responsibility | Task |
|------|---------------|------|
| `components/sections/home/SobreTriniSection.tsx` | Fix viewport margin for mobile clip-path | 1 |
| `app/panel/tienda/page.tsx` | Server component: data loading, serialization, layout shell | 2 |
| `app/panel/tienda/TiendaPlans.tsx` | **New** — Client component: billing toggle + plan cards grid | 2 |
| `app/catalogo/page.tsx` | Dark hero + Netflix rows layout | 3 |
| `app/catalogo/[categoryId]/page.tsx` | Add dark hero header with breadcrumb | 4 |

---

### Task 1: Fix SobreTrini Image on Mobile

**Files:**
- Modify: `components/sections/home/SobreTriniSection.tsx:62`

- [ ] **Step 1: Fix viewport margin**

In `components/sections/home/SobreTriniSection.tsx`, line 62, change:

```tsx
viewport={{ once: true, margin: "-60px" }}
```

To:

```tsx
viewport={{ once: true, margin: "0px" }}
```

The `clipPath: "inset(0 0 100% 0)"` initial state makes the element have zero visible height, so the IntersectionObserver with `-60px` margin doesn't detect it on small mobile viewports. Setting margin to `"0px"` triggers the animation as soon as the element enters the viewport.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/sections/home/SobreTriniSection.tsx
git commit -m "fix: SobreTrini image clip-path animation not triggering on mobile

The IntersectionObserver margin of -60px couldn't detect the element
when clipPath inset(0 0 100% 0) made it zero-height on small viewports.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Tienda — Toggle Billing + New Plan Cards

**Files:**
- Modify: `app/panel/tienda/page.tsx` (server component — data loading + layout shell)
- Create: `app/panel/tienda/TiendaPlans.tsx` (client component — toggle + cards)

- [ ] **Step 1: Create TiendaPlans client component**

Create `app/panel/tienda/TiendaPlans.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ComprarPlanButton } from "@/app/planes/ComprarPlanButton";
import SuscribirmeButton from "@/app/planes/SuscribirmeButton";

/* ─── Types (serializable from server) ───────────────────────────────────── */

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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

/* ─── Billing Toggle ─────────────────────────────────────────────────────── */

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

/* ─── Plan Card ──────────────────────────────────────────────────────────── */

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

  // Determine what to show based on toggle + plan capabilities
  const showMonthly = billing === "monthly" && canRecurring;
  const activePrice = showMonthly ? recurringPrice(plan) : plan.amountCents;
  const priceSuffix = showMonthly ? "/mes" : "pago único";
  const showStrikethrough = showMonthly && hasDiscount;

  // Features list
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

      {/* Price */}
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
  const [billing, setBilling] = useState<"one-time" | "monthly">("one-time");

  // Check if any plan supports recurring billing
  const hasAnyRecurring = plans.some(
    (p) => p.billingMode === "RECURRING" || p.billingMode === "BOTH"
  );

  // Max discount across all plans (for toggle badge)
  const maxDiscount = Math.max(
    0,
    ...plans.map((p) => p.recurringDiscountPercent ?? 0)
  );

  // Group by type
  const groups = TYPE_ORDER
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      description: TYPE_DESCRIPTIONS[type],
      plans: plans.filter((p) => p.type === type),
    }))
    .filter((g) => g.plans.length > 0);

  // Find the "popular" plan (most expensive LIVE plan, or first with most reservations)
  const livePlans = plans.filter((p) => p.type === "LIVE");
  const popularPlanId = livePlans.length > 0
    ? livePlans.reduce((best, p) =>
        (p.maxReservations ?? Infinity) > (best.maxReservations ?? Infinity) ? p : best
      ).id
    : null;

  return (
    <>
      {hasAnyRecurring && (
        <BillingToggle
          billing={billing}
          onChange={setBilling}
          maxDiscount={maxDiscount}
        />
      )}

      <div className="space-y-10">
        {groups.map(({ type, label, description, plans: typePlans }) => (
          <div key={type}>
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                {label}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {description}
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {typePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billing={billing}
                  isPopular={plan.id === popularPlanId}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Rewrite tienda server component**

Replace the entire content of `app/panel/tienda/page.tsx` with:

```tsx
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

  // Build MisPlans data (same logic as before)
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

  // Serialize plans for client component
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

      {/* Mis planes */}
      <div className="mb-12">
        <MisPlansTabs items={misPlansItems} />
      </div>

      {/* Planes disponibles */}
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
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run unit tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add app/panel/tienda/page.tsx app/panel/tienda/TiendaPlans.tsx
git commit -m "feat(tienda): toggle billing pricing cards with plan groups

Stripe-style toggle switches between pago único and mensual.
Cards show price, features, and single CTA. Grouped by plan type
with descriptive headers. Popular plan highlighted.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Catálogo — Dark Hero + Netflix Rows

**Files:**
- Modify: `app/catalogo/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite catalog page**

Replace the entire content of `app/catalogo/page.tsx` with:

```tsx
import { onDemandCategoryRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const revalidate = 300; // 5 min ISR

export default async function CatalogoPage() {
  const center = await prisma.center.findFirst();
  if (!center) return <p className="p-8 text-[var(--color-text-muted)]">Centro no configurado.</p>;

  const categoriesTree = await onDemandCategoryRepository.findPublishedTreeByCenterId(center.id);
  const categories = categoriesTree.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    practices: cat.practices.map((p) => ({
      id: p.id,
      name: p.name,
      thumbnailUrl: p.thumbnailUrl ?? null,
      lessonCount: p.lessons.length,
      durationRange: p.lessons.length > 0
        ? (() => {
            const durations = p.lessons.map((l) => l.durationMinutes).filter(Boolean) as number[];
            if (durations.length === 0) return null;
            const min = Math.min(...durations);
            const max = Math.max(...durations);
            return min === max ? `${min} min` : `${min}–${max} min`;
          })()
        : null,
    })),
  }));

  const hasContent = categories.length > 0;

  return (
    <>
      {/* Dark hero header */}
      <section className="bg-[var(--color-primary)] pt-[calc(var(--header-height)+var(--space-10))] pb-[var(--space-12)] px-[var(--space-4)] md:px-[var(--space-8)]">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-section font-display font-semibold text-white">
            Catálogo on demand
          </h1>
          <p className="text-base text-white/70 mt-2 max-w-lg">
            Practica a tu ritmo con clases grabadas
          </p>
          <div className="mt-6">
            <Button href="/panel/tienda" variant="light">
              Ver planes
            </Button>
          </div>
        </div>
      </section>

      {/* Netflix rows */}
      <div className="mx-auto max-w-4xl px-[var(--space-4)] md:px-[var(--space-8)] py-[var(--space-10)] space-y-10">
        {!hasContent ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-8 border border-[var(--color-border)] text-center animate-fade-in">
            <p className="text-[var(--color-text-muted)] mb-4">
              Aún no hay contenido disponible.
            </p>
            <Button href="/panel/tienda" variant="primary">
              Ver planes
            </Button>
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              {/* Row header */}
              <div className="flex items-center justify-between mb-4">
                <h2
                  id={`cat-${cat.id}`}
                  className="text-lg font-semibold text-[var(--color-primary)]"
                >
                  {cat.name}
                </h2>
                <Link
                  href={`/catalogo/${cat.id}`}
                  className="text-sm font-medium text-[var(--color-secondary)] hover:underline"
                >
                  Ver todo →
                </Link>
              </div>

              {/* Horizontal scroll */}
              <div
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
              >
                {cat.practices.map((practice) => (
                  <Link
                    key={practice.id}
                    href={`/catalogo/${cat.id}/${practice.id}`}
                    className="min-w-[160px] sm:min-w-[200px] max-w-[200px] sm:max-w-[240px] shrink-0 snap-start rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow group"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[16/10] overflow-hidden">
                      {practice.thumbnailUrl ? (
                        <img
                          src={practice.thumbnailUrl}
                          alt={practice.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
                          }}
                        />
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                        {practice.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {practice.lessonCount} {practice.lessonCount === 1 ? "clase" : "clases"}
                        {practice.durationRange && ` · ${practice.durationRange}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/catalogo/page.tsx
git commit -m "feat(catalogo): dark hero header + Netflix-style horizontal rows

Dark primary background hero gives contrast for the fixed transparent
header. Categories as horizontal scroll rows with practice cards showing
thumbnail, name, lesson count, and duration range.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Category Detail — Dark Hero with Breadcrumb

**Files:**
- Modify: `app/catalogo/[categoryId]/page.tsx`

- [ ] **Step 1: Add dark hero header with breadcrumb**

Replace the entire content of `app/catalogo/[categoryId]/page.tsx` with:

```tsx
import { onDemandCategoryRepository, onDemandPracticeRepository } from "@/lib/adapters/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoryId: string }>;
}

export default async function CatalogoCategoryPage({ params }: Props) {
  const { categoryId } = await params;

  const [category, practicesWithLessons] = await Promise.all([
    onDemandCategoryRepository.findById(categoryId),
    onDemandPracticeRepository.findPublishedWithLessonsByCategoryId(categoryId),
  ]);
  if (!category || category.status !== "PUBLISHED") notFound();

  const practicesWithCounts = practicesWithLessons.map((p) => ({
    ...p,
    lessonCount: p.lessons.length,
  }));

  return (
    <>
      {/* Dark hero header with breadcrumb */}
      <section className="bg-[var(--color-primary)] pt-[calc(var(--header-height)+var(--space-8))] pb-[var(--space-10)] px-[var(--space-4)] md:px-[var(--space-8)]">
        <div className="mx-auto max-w-4xl">
          <nav className="text-sm flex items-center gap-2 mb-4">
            <Link href="/catalogo" className="text-white/60 hover:text-white/90 transition-colors">
              Catálogo
            </Link>
            <span className="text-white/40">/</span>
            <span className="text-white/90">{category.name}</span>
          </nav>
          <h1 className="text-section font-display font-semibold text-white">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-base text-white/70 mt-2 max-w-lg">{category.description}</p>
          )}
        </div>
      </section>

      {/* Practice cards */}
      <div className="mx-auto max-w-4xl px-[var(--space-4)] md:px-[var(--space-8)] py-[var(--space-10)]">
        {practicesWithCounts.length === 0 ? (
          <p className="text-[var(--color-text-muted)] animate-fade-in">
            Aún no hay prácticas disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {practicesWithCounts.map((practice) => (
              <Link
                key={practice.id}
                href={`/catalogo/${category.id}/${practice.id}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow"
              >
                {practice.thumbnailUrl && (
                  <img
                    src={practice.thumbnailUrl}
                    alt={practice.name}
                    loading="lazy"
                    className="w-full h-40 object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                )}
                <div className="p-4">
                  <h2 className="text-lg font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                    {practice.name}
                  </h2>
                  {practice.description && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {practice.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    {practice.lessonCount} {practice.lessonCount === 1 ? "clase" : "clases"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center pt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Inicia sesión para desbloquear
          </Link>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/catalogo/[categoryId]/page.tsx
git commit -m "feat(catalogo): add dark hero header with breadcrumb to category detail

Consistent dark primary background header matching the catalog index.
Breadcrumb navigation: Catálogo / Category Name.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final — Run Full Test Suite & E2E

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run unit tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Run E2E**

Run: `npx playwright test`
Expected: 80+ passed, ≤1 skipped, 0 failed

- [ ] **Step 4: Push branch**

```bash
git push -u origin feature/tienda-catalogo-redesign
```
