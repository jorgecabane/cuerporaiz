# Planes Recurrentes (Suscripciones MercadoPago) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable recurring subscription billing via MercadoPago preapproval API, including subscription creation, webhook processing for payment/status events, auto-renewal of UserPlan periods, and failure/cancellation handling.

**Architecture:** Extend the existing hexagonal architecture. New `ISubscriptionProvider` port for MP preapproval API calls (create, get, cancel). New `ISubscriptionRepository` port for local DB CRUD. Expand webhook handler to route subscription topics (`subscription_preapproval`, `subscription_authorized_payment`) alongside existing `payment` topic. Each billing cycle auto-renews the UserPlan via `subscription_authorized_payment` webhook.

**Tech Stack:** Next.js 16, Prisma 7 (PostgreSQL), MercadoPago Preapproval REST API, Zod, Vitest

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/ports/subscription-provider.ts` | Port: MP preapproval API contract (create, get, cancel, pause) |
| `lib/ports/subscription-repository.ts` | Port: local Subscription CRUD contract |
| `lib/adapters/payment/mercadopago-subscription.adapter.ts` | Adapter: implements `ISubscriptionProvider` via MP REST API |
| `lib/adapters/db/subscription-repository.ts` | Adapter: Prisma implementation of `ISubscriptionRepository` |
| `lib/dto/subscription-dto.ts` | Zod-validated DTOs for subscription API boundaries |
| `lib/application/subscription-checkout.ts` | Use case: create subscription checkout (preapproval) |
| `lib/application/process-subscription-webhook.ts` | Use case: handle subscription & authorized_payment webhooks |
| `lib/domain/subscription.ts` | Domain types + helpers (status labels, isSubscriptionActive) |
| `lib/domain/subscription.test.ts` | Unit tests for subscription domain |
| `lib/application/subscription-checkout.test.ts` | Unit tests for subscription checkout use case |
| `lib/application/process-subscription-webhook.test.ts` | Unit tests for subscription webhook processing |
| `lib/dto/subscription-dto.test.ts` | Unit tests for subscription DTOs |
| `app/api/subscriptions/create/route.ts` | API route: POST create subscription |
| `app/api/subscriptions/cancel/route.ts` | API route: POST cancel subscription |

### Modified Files

| File | Changes |
|------|---------|
| `lib/ports/index.ts` | Export new subscription ports |
| `lib/adapters/db/index.ts` | Export `subscriptionRepository` |
| `lib/adapters/payment/index.ts` | Export `mercadoPagoSubscriptionAdapter` |
| `lib/application/checkout.ts` | Expand `processWebhookUseCase` to route subscription topics |
| `app/api/webhooks/mercadopago/[centerId]/route.ts` | No change needed — already passes raw body to use case |
| `app/panel/tienda/page.tsx:134-138` | Remove disabled "Suscribirme" button, render `SuscribirmeButton` client component |
| `lib/ports/user-plan-repository.ts` | Add `findActiveBySubscriptionId` method |
| `lib/adapters/db/user-plan-repository.ts` | Implement `findActiveBySubscriptionId` |

### New Client Component

| File | Responsibility |
|------|---------------|
| `app/planes/SuscribirmeButton.tsx` | Client component: handles subscription checkout redirect (like `ComprarPlanButton`) |
| `lib/email/transactional.ts` | Add 3 email builders: subscription confirmed, renewal success, subscription cancelled |

---

## Task 1: Subscription Domain Types + Helpers

**Files:**
- Create: `lib/domain/subscription.ts`
- Test: `lib/domain/subscription.test.ts`

- [ ] **Step 1: Write failing tests for domain helpers**

```typescript
// lib/domain/subscription.test.ts
import { describe, it, expect } from "vitest";
import {
  isSubscriptionActive,
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from "./subscription";

describe("isSubscriptionActive", () => {
  it("returns true for ACTIVE status", () => {
    expect(isSubscriptionActive("ACTIVE")).toBe(true);
  });

  it("returns false for PAUSED status", () => {
    expect(isSubscriptionActive("PAUSED")).toBe(false);
  });

  it("returns false for CANCELLED status", () => {
    expect(isSubscriptionActive("CANCELLED")).toBe(false);
  });

  it("returns false for PAYMENT_FAILED status", () => {
    expect(isSubscriptionActive("PAYMENT_FAILED")).toBe(false);
  });
});

describe("SUBSCRIPTION_STATUS_LABELS", () => {
  it("has labels for all statuses", () => {
    const statuses: SubscriptionStatus[] = ["ACTIVE", "PAUSED", "CANCELLED", "PAYMENT_FAILED"];
    for (const s of statuses) {
      expect(SUBSCRIPTION_STATUS_LABELS[s]).toBeDefined();
      expect(typeof SUBSCRIPTION_STATUS_LABELS[s]).toBe("string");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/domain/subscription.test.ts`
Expected: FAIL — module `./subscription` not found

- [ ] **Step 3: Write domain types and helpers**

```typescript
// lib/domain/subscription.ts
export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "PAYMENT_FAILED";

export interface Subscription {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  mpSubscriptionId: string;
  mpPayerId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
  PAYMENT_FAILED: "Pago fallido",
};

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "ACTIVE";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/domain/subscription.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/domain/subscription.ts lib/domain/subscription.test.ts
git commit -m "feat: add subscription domain types and helpers"
```

---

## Task 2: Subscription DTOs (Zod-validated)

**Files:**
- Create: `lib/dto/subscription-dto.ts`
- Test: `lib/dto/subscription-dto.test.ts`

- [ ] **Step 1: Write failing tests for DTOs**

```typescript
// lib/dto/subscription-dto.test.ts
import { describe, it, expect } from "vitest";
import {
  createSubscriptionBodySchema,
  cancelSubscriptionBodySchema,
} from "./subscription-dto";

describe("createSubscriptionBodySchema", () => {
  it("accepts valid input with planId", () => {
    const result = createSubscriptionBodySchema.safeParse({
      planId: "clx1234567890abcdef12345",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing planId", () => {
    const result = createSubscriptionBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("cancelSubscriptionBodySchema", () => {
  it("accepts valid subscriptionId", () => {
    const result = cancelSubscriptionBodySchema.safeParse({
      subscriptionId: "clx1234567890abcdef12345",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty subscriptionId", () => {
    const result = cancelSubscriptionBodySchema.safeParse({
      subscriptionId: "",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/dto/subscription-dto.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write DTOs**

```typescript
// lib/dto/subscription-dto.ts
import { z } from "zod";

// ─── API request: create subscription ────────────────────────────────────────
// centerId comes from session.user.centerId (JWT), not from the request body
export const createSubscriptionBodySchema = z.object({
  planId: z.string().min(1),
});
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;

// ─── API request: cancel subscription ────────────────────────────────────────
export const cancelSubscriptionBodySchema = z.object({
  subscriptionId: z.string().min(1),
});
export type CancelSubscriptionBody = z.infer<typeof cancelSubscriptionBodySchema>;

// ─── Provider DTOs (adapter boundary) ────────────────────────────────────────

export interface CreatePreapprovalDto {
  accessToken: string;
  planName: string;
  amountCents: number;
  currency: string;
  frequency: number;           // billing cycle count (1 = every period)
  frequencyType: "months";     // MP only supports months for Chile
  payerEmail: string;
  externalReference: string;
  notificationUrl: string;
  backUrl: string;
}

export interface CreatePreapprovalResultDto {
  success: boolean;
  subscriptionUrl?: string;    // URL for user to authorize subscription
  mpSubscriptionId?: string;   // preapproval ID
  error?: string;
}

export interface GetPreapprovalDto {
  accessToken: string;
  mpSubscriptionId: string;
}

export interface PreapprovalStatusDto {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  payerId: string | null;
  dateCreated: string;
  lastModified: string;
  nextPaymentDate: string | null;
}

export interface GetAuthorizedPaymentDto {
  accessToken: string;
  authorizedPaymentId: string;
}

export interface AuthorizedPaymentStatusDto {
  id: string;
  preapprovalId: string;
  status: "approved" | "rejected" | "pending" | "cancelled";
  transactionAmount: number;
  dateCreated: string;
}

export interface CancelPreapprovalDto {
  accessToken: string;
  mpSubscriptionId: string;
}

export interface CancelPreapprovalResultDto {
  success: boolean;
  error?: string;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/dto/subscription-dto.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/dto/subscription-dto.ts lib/dto/subscription-dto.test.ts
git commit -m "feat: add subscription DTOs with Zod validation"
```

---

## Task 3: Subscription Provider Port + MercadoPago Adapter

**Files:**
- Create: `lib/ports/subscription-provider.ts`
- Create: `lib/adapters/payment/mercadopago-subscription.adapter.ts`
- Modify: `lib/ports/index.ts` (add export)
- Modify: `lib/adapters/payment/index.ts` (add export)

- [ ] **Step 1: Write subscription provider port**

```typescript
// lib/ports/subscription-provider.ts
import type {
  CreatePreapprovalDto,
  CreatePreapprovalResultDto,
  GetPreapprovalDto,
  PreapprovalStatusDto,
  GetAuthorizedPaymentDto,
  AuthorizedPaymentStatusDto,
  CancelPreapprovalDto,
  CancelPreapprovalResultDto,
} from "@/lib/dto/subscription-dto";

export interface ISubscriptionProvider {
  createPreapproval(dto: CreatePreapprovalDto): Promise<CreatePreapprovalResultDto>;
  getPreapproval(dto: GetPreapprovalDto): Promise<PreapprovalStatusDto | null>;
  getAuthorizedPayment(dto: GetAuthorizedPaymentDto): Promise<AuthorizedPaymentStatusDto | null>;
  cancelPreapproval(dto: CancelPreapprovalDto): Promise<CancelPreapprovalResultDto>;
}
```

- [ ] **Step 2: Write MercadoPago subscription adapter**

```typescript
// lib/adapters/payment/mercadopago-subscription.adapter.ts
import type { ISubscriptionProvider } from "@/lib/ports/subscription-provider";
import type {
  CreatePreapprovalDto,
  CreatePreapprovalResultDto,
  GetPreapprovalDto,
  PreapprovalStatusDto,
  GetAuthorizedPaymentDto,
  AuthorizedPaymentStatusDto,
  CancelPreapprovalDto,
  CancelPreapprovalResultDto,
} from "@/lib/dto/subscription-dto";

const MP_API = "https://api.mercadopago.com";

function mpHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export const mercadoPagoSubscriptionAdapter: ISubscriptionProvider = {
  async createPreapproval(dto: CreatePreapprovalDto): Promise<CreatePreapprovalResultDto> {
    try {
      const body = {
        reason: dto.planName,
        auto_recurring: {
          frequency: dto.frequency,
          frequency_type: dto.frequencyType,
          transaction_amount: dto.amountCents,
          currency_id: dto.currency,
        },
        payer_email: dto.payerEmail,
        external_reference: dto.externalReference,
        notification_url: dto.notificationUrl,
        back_url: dto.backUrl,
        status: "pending",
      };

      const res = await fetch(`${MP_API}/preapproval`, {
        method: "POST",
        headers: mpHeaders(dto.accessToken),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message ?? `HTTP ${res.status}` };
      }

      return {
        success: true,
        subscriptionUrl: data.init_point,
        mpSubscriptionId: data.id,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Error creating preapproval" };
    }
  },

  async getPreapproval(dto: GetPreapprovalDto): Promise<PreapprovalStatusDto | null> {
    try {
      const res = await fetch(`${MP_API}/preapproval/${dto.mpSubscriptionId}`, {
        headers: mpHeaders(dto.accessToken),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id,
        status: data.status,
        payerId: data.payer_id ? String(data.payer_id) : null,
        dateCreated: data.date_created,
        lastModified: data.last_modified,
        nextPaymentDate: data.next_payment_date ?? null,
      };
    } catch {
      return null;
    }
  },

  async getAuthorizedPayment(dto: GetAuthorizedPaymentDto): Promise<AuthorizedPaymentStatusDto | null> {
    try {
      const res = await fetch(`${MP_API}/authorized_payments/${dto.authorizedPaymentId}`, {
        headers: mpHeaders(dto.accessToken),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: String(data.id),
        preapprovalId: data.preapproval_id,
        status: data.status,
        transactionAmount: data.transaction_amount,
        dateCreated: data.date_created,
      };
    } catch {
      return null;
    }
  },

  async cancelPreapproval(dto: CancelPreapprovalDto): Promise<CancelPreapprovalResultDto> {
    try {
      const res = await fetch(`${MP_API}/preapproval/${dto.mpSubscriptionId}`, {
        method: "PUT",
        headers: mpHeaders(dto.accessToken),
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.message ?? `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Error cancelling" };
    }
  },
};
```

- [ ] **Step 3: Export from ports/index.ts**

Add to `lib/ports/index.ts`:
```typescript
export type { ISubscriptionProvider } from "./subscription-provider";
```

- [ ] **Step 4: Export from adapters/payment/index.ts**

Add to `lib/adapters/payment/index.ts`:
```typescript
export { mercadoPagoSubscriptionAdapter } from "./mercadopago-subscription.adapter";
```

- [ ] **Step 5: Commit**

```bash
git add lib/ports/subscription-provider.ts lib/adapters/payment/mercadopago-subscription.adapter.ts lib/ports/index.ts lib/adapters/payment/index.ts
git commit -m "feat: add subscription provider port and MercadoPago preapproval adapter"
```

---

## Task 4: Subscription Repository Port + Prisma Adapter

**Files:**
- Create: `lib/ports/subscription-repository.ts`
- Create: `lib/adapters/db/subscription-repository.ts`
- Modify: `lib/ports/index.ts` (add export)
- Modify: `lib/adapters/db/index.ts` (add export)

- [ ] **Step 1: Write subscription repository port**

```typescript
// lib/ports/subscription-repository.ts
import type { Subscription, SubscriptionStatus } from "@/lib/domain/subscription";

export interface CreateSubscriptionInput {
  centerId: string;
  userId: string;
  planId: string;
  mpSubscriptionId: string;
  mpPayerId?: string | null;
  status?: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface ISubscriptionRepository {
  create(input: CreateSubscriptionInput): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByMpSubscriptionId(mpSubscriptionId: string): Promise<Subscription | null>;
  findActiveByUserAndCenter(userId: string, centerId: string): Promise<Subscription[]>;
  updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;
  updatePeriod(id: string, periodStart: Date, periodEnd: Date): Promise<Subscription>;
}
```

- [ ] **Step 2: Write Prisma adapter**

```typescript
// lib/adapters/db/subscription-repository.ts
import { prisma } from "./prisma";
import type { ISubscriptionRepository, CreateSubscriptionInput } from "@/lib/ports/subscription-repository";
import type { Subscription, SubscriptionStatus } from "@/lib/domain/subscription";

function toDomain(row: {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  mpSubscriptionId: string;
  mpPayerId: string | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}): Subscription {
  return {
    ...row,
    status: row.status as SubscriptionStatus,
  };
}

export const subscriptionRepository: ISubscriptionRepository = {
  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const row = await prisma.subscription.create({ data: input });
    return toDomain(row);
  },

  async findById(id: string): Promise<Subscription | null> {
    const row = await prisma.subscription.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  },

  async findByMpSubscriptionId(mpSubscriptionId: string): Promise<Subscription | null> {
    const row = await prisma.subscription.findUnique({ where: { mpSubscriptionId } });
    return row ? toDomain(row) : null;
  },

  async findActiveByUserAndCenter(userId: string, centerId: string): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { userId, centerId, status: "ACTIVE" },
    });
    return rows.map(toDomain);
  },

  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription> {
    const row = await prisma.subscription.update({ where: { id }, data: { status } });
    return toDomain(row);
  },

  async updatePeriod(id: string, periodStart: Date, periodEnd: Date): Promise<Subscription> {
    const row = await prisma.subscription.update({
      where: { id },
      data: { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
    });
    return toDomain(row);
  },
};
```

- [ ] **Step 3: Export from ports/index.ts**

Add to `lib/ports/index.ts`:
```typescript
export type { ISubscriptionRepository, CreateSubscriptionInput } from "./subscription-repository";
```

- [ ] **Step 4: Export from adapters/db/index.ts**

Add to `lib/adapters/db/index.ts`:
```typescript
export { subscriptionRepository } from "./subscription-repository";
```

- [ ] **Step 5: Commit**

```bash
git add lib/ports/subscription-repository.ts lib/adapters/db/subscription-repository.ts lib/ports/index.ts lib/adapters/db/index.ts
git commit -m "feat: add subscription repository port and Prisma adapter"
```

---

## Task 5: Subscription Checkout Use Case

**Files:**
- Create: `lib/application/subscription-checkout.ts`
- Test: `lib/application/subscription-checkout.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/application/subscription-checkout.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeSubscriptionAmount } from "./subscription-checkout";

describe("computeSubscriptionAmount", () => {
  it("applies recurring discount", () => {
    expect(computeSubscriptionAmount(10000, 15)).toBe(8500);
  });

  it("returns original when no discount", () => {
    expect(computeSubscriptionAmount(10000, 0)).toBe(10000);
  });

  it("returns original when discount is null", () => {
    expect(computeSubscriptionAmount(10000, null)).toBe(10000);
  });

  it("handles 100% discount", () => {
    expect(computeSubscriptionAmount(10000, 100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run lib/application/subscription-checkout.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write subscription checkout use case**

```typescript
// lib/application/subscription-checkout.ts
import * as crypto from "node:crypto";
import {
  centerRepository,
  mercadopagoConfigRepository,
  planRepository,
  subscriptionRepository,
  orderRepository,
} from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";
import { computeValidUntil } from "./activate-plan";

export interface CreateSubscriptionCheckoutInput {
  centerId: string;
  userId: string;
  planId: string;
  baseUrl: string;
  payerEmail: string;
}

export interface CreateSubscriptionCheckoutResult {
  success: boolean;
  subscriptionUrl?: string;
  error?: string;
}

/** Compute subscription price applying recurring discount */
export function computeSubscriptionAmount(
  amountCents: number,
  recurringDiscountPercent: number | null
): number {
  const discount = recurringDiscountPercent ?? 0;
  return Math.round(amountCents * (1 - discount / 100));
}

/** Maps plan.validityPeriod to MP frequency in months */
function periodToMonths(period: string | null): number {
  switch (period) {
    case "MONTHLY": return 1;
    case "QUARTERLY": return 3;
    case "QUADRIMESTRAL": return 4;
    case "SEMESTER": return 6;
    case "ANNUAL": return 12;
    default: return 1;
  }
}

export async function createSubscriptionCheckoutUseCase(
  input: CreateSubscriptionCheckoutInput
): Promise<CreateSubscriptionCheckoutResult> {
  const center = await centerRepository.findById(input.centerId);
  if (!center) return { success: false, error: "Centro no encontrado" };

  const config = await mercadopagoConfigRepository.findByCenterId(center.id);
  if (!config?.enabled) return { success: false, error: "MercadoPago no configurado" };

  const plan = await planRepository.findById(input.planId);
  if (!plan || plan.centerId !== center.id) return { success: false, error: "Plan no encontrado" };

  if (plan.billingMode !== "RECURRING" && plan.billingMode !== "BOTH") {
    return { success: false, error: "Este plan no admite suscripción recurrente" };
  }

  const amount = computeSubscriptionAmount(plan.amountCents, plan.recurringDiscountPercent);
  const frequency = periodToMonths(plan.validityPeriod);
  const externalRef = `sub_${crypto.randomUUID()}`;
  const base = input.baseUrl.replace(/\/$/, "");

  const result = await mercadoPagoSubscriptionAdapter.createPreapproval({
    accessToken: config.accessToken,
    planName: plan.name,
    amountCents: amount,
    currency: plan.currency,
    frequency,
    frequencyType: "months",
    payerEmail: input.payerEmail,
    externalReference: externalRef,
    notificationUrl: `${base}/api/webhooks/mercadopago/${center.id}`,
    backUrl: `${base}/panel/tienda?subscription=pending`,
  });

  if (!result.success) return { success: false, error: result.error };

  // Store Subscription in DB immediately so webhooks can find it
  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  await subscriptionRepository.create({
    centerId: center.id,
    userId: input.userId,
    planId: plan.id,
    mpSubscriptionId: result.mpSubscriptionId!,
    status: "ACTIVE",
    currentPeriodStart: now,
    currentPeriodEnd: validUntil ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
  });

  return {
    success: true,
    subscriptionUrl: result.subscriptionUrl,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/application/subscription-checkout.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/application/subscription-checkout.ts lib/application/subscription-checkout.test.ts
git commit -m "feat: add subscription checkout use case with recurring discount"
```

---

## Task 6: Process Subscription Webhooks

**Files:**
- Create: `lib/application/process-subscription-webhook.ts`
- Test: `lib/application/process-subscription-webhook.test.ts`
- Modify: `lib/application/checkout.ts` (route subscription topics)

This is the core of the feature: handling MP webhook events for subscription status changes and recurring payments.

- [ ] **Step 1: Write failing tests for webhook topic routing**

```typescript
// lib/application/process-subscription-webhook.test.ts
import { describe, it, expect } from "vitest";
import { mapMpStatusToSubscription, mapMpStatusToUserPlan } from "./process-subscription-webhook";

describe("mapMpStatusToSubscription", () => {
  it("maps authorized to ACTIVE", () => {
    expect(mapMpStatusToSubscription("authorized")).toBe("ACTIVE");
  });
  it("maps paused to PAUSED", () => {
    expect(mapMpStatusToSubscription("paused")).toBe("PAUSED");
  });
  it("maps cancelled to CANCELLED", () => {
    expect(mapMpStatusToSubscription("cancelled")).toBe("CANCELLED");
  });
  it("maps pending to ACTIVE (still billing)", () => {
    expect(mapMpStatusToSubscription("pending")).toBe("ACTIVE");
  });
});

describe("mapMpStatusToUserPlan", () => {
  it("maps ACTIVE subscription to ACTIVE userPlan", () => {
    expect(mapMpStatusToUserPlan("ACTIVE")).toBe("ACTIVE");
  });
  it("maps PAUSED subscription to FROZEN userPlan", () => {
    expect(mapMpStatusToUserPlan("PAUSED")).toBe("FROZEN");
  });
  it("maps CANCELLED subscription to CANCELLED userPlan", () => {
    expect(mapMpStatusToUserPlan("CANCELLED")).toBe("CANCELLED");
  });
  it("maps PAYMENT_FAILED to FROZEN userPlan", () => {
    expect(mapMpStatusToUserPlan("PAYMENT_FAILED")).toBe("FROZEN");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run lib/application/process-subscription-webhook.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write subscription webhook processor**

```typescript
// lib/application/process-subscription-webhook.ts
import {
  subscriptionRepository,
  mercadopagoConfigRepository,
  userPlanRepository,
} from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";
import { computeValidUntil } from "./activate-plan";
import { planRepository } from "@/lib/adapters/db";
import type { SubscriptionStatus } from "@/lib/domain/subscription";
import type { UserPlanStatus } from "@/lib/domain/user-plan";

/** Maps MP preapproval status → our SubscriptionStatus */
export function mapMpStatusToSubscription(mpStatus: string): SubscriptionStatus {
  switch (mpStatus) {
    case "authorized": return "ACTIVE";
    case "paused": return "PAUSED";
    case "cancelled": return "CANCELLED";
    default: return "ACTIVE";
  }
}

/** Maps our SubscriptionStatus → UserPlanStatus */
export function mapMpStatusToUserPlan(subStatus: SubscriptionStatus): UserPlanStatus {
  switch (subStatus) {
    case "ACTIVE": return "ACTIVE";
    case "PAUSED": return "FROZEN";
    case "CANCELLED": return "CANCELLED";
    case "PAYMENT_FAILED": return "FROZEN";
  }
}

/**
 * Handles `subscription_preapproval` webhook.
 * Updates local Subscription status and cascades to UserPlan.
 */
export async function processPreapprovalWebhook(
  centerId: string,
  mpSubscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const config = await mercadopagoConfigRepository.findByCenterId(centerId);
  if (!config?.enabled) return { success: false, error: "MP not configured" };

  const preapproval = await mercadoPagoSubscriptionAdapter.getPreapproval({
    accessToken: config.accessToken,
    mpSubscriptionId,
  });
  if (!preapproval) return { success: false, error: "Could not fetch preapproval" };

  let subscription = await subscriptionRepository.findByMpSubscriptionId(mpSubscriptionId);
  const newStatus = mapMpStatusToSubscription(preapproval.status);

  if (!subscription) {
    // First webhook — subscription just authorized. We need the plan to create records.
    // The external_reference from the preapproval links back to our system.
    // For now, we create the Subscription record when the first authorized_payment arrives.
    // This webhook just updates status if subscription already exists.
    return { success: true };
  }

  if (subscription.status !== newStatus) {
    subscription = await subscriptionRepository.updateStatus(subscription.id, newStatus);

    // Cascade status to active UserPlan via repository (not raw Prisma)
    const activeUserPlan = await userPlanRepository.findActiveBySubscriptionId(subscription.id);

    if (activeUserPlan) {
      const userPlanStatus = mapMpStatusToUserPlan(newStatus);
      if (userPlanStatus === "FROZEN") {
        await userPlanRepository.freeze(activeUserPlan.id, `Suscripción ${newStatus.toLowerCase()}`, null);
      } else if (userPlanStatus === "ACTIVE" && activeUserPlan.status === "FROZEN") {
        await userPlanRepository.unfreeze(activeUserPlan.id);
      } else {
        await userPlanRepository.updateStatus(activeUserPlan.id, userPlanStatus);
      }
    }
  }

  return { success: true };
}

/**
 * Handles `subscription_authorized_payment` webhook.
 * Each billing cycle fires this. Creates Order + renews UserPlan.
 */
export async function processAuthorizedPaymentWebhook(
  centerId: string,
  authorizedPaymentId: string
): Promise<{ success: boolean; error?: string }> {
  const config = await mercadopagoConfigRepository.findByCenterId(centerId);
  if (!config?.enabled) return { success: false, error: "MP not configured" };

  const payment = await mercadoPagoSubscriptionAdapter.getAuthorizedPayment({
    accessToken: config.accessToken,
    authorizedPaymentId,
  });
  if (!payment) return { success: false, error: "Could not fetch authorized payment" };

  const subscription = await subscriptionRepository.findByMpSubscriptionId(payment.preapprovalId);
  if (!subscription) {
    // Subscription not yet in our DB — might be the first payment after authorization
    // We need to create the Subscription + first UserPlan
    return await handleFirstAuthorizedPayment(centerId, payment.preapprovalId, payment, config.accessToken);
  }

  if (payment.status !== "approved") {
    // Payment failed — update subscription status
    if (payment.status === "rejected") {
      await subscriptionRepository.updateStatus(subscription.id, "PAYMENT_FAILED");
    }
    return { success: true };
  }

  // Payment approved — renew the period
  const plan = await planRepository.findById(subscription.planId);
  if (!plan) return { success: false, error: "Plan not found" };

  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  // Update subscription period
  await subscriptionRepository.updatePeriod(
    subscription.id,
    now,
    validUntil ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  );

  // Ensure subscription is ACTIVE
  if (subscription.status !== "ACTIVE") {
    await subscriptionRepository.updateStatus(subscription.id, "ACTIVE");
  }

  // Create new UserPlan for this period (or renew existing via repository)
  const existingUserPlan = await userPlanRepository.findActiveBySubscriptionId(subscription.id);

  if (existingUserPlan) {
    // Renew existing: create a new UserPlan for the new period
    // (old one will naturally expire via validUntil)
    await userPlanRepository.create({
      userId: subscription.userId,
      planId: plan.id,
      centerId: subscription.centerId,
      subscriptionId: subscription.id,
      paymentStatus: "PAID",
      classesTotal: plan.maxReservations,
      validFrom: now,
      validUntil,
    });
  } else {
    // Create new UserPlan for this billing cycle
    await userPlanRepository.create({
      userId: subscription.userId,
      planId: plan.id,
      centerId: subscription.centerId,
      subscriptionId: subscription.id,
      paymentStatus: "PAID",
      classesTotal: plan.maxReservations,
      validFrom: now,
      validUntil,
    });
  }

  return { success: true };
}

async function handleFirstAuthorizedPayment(
  centerId: string,
  mpSubscriptionId: string,
  payment: { id: string; status: string; transactionAmount: number },
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  if (payment.status !== "approved") return { success: true };

  // Subscription should exist — it was stored in createSubscriptionCheckoutUseCase (Task 5).
  // If it doesn't exist, it means the webhook arrived before our DB write (unlikely but possible).
  const subscription = await subscriptionRepository.findByMpSubscriptionId(mpSubscriptionId);
  if (!subscription) {
    console.error(`[subscription-webhook] Subscription not found for mpSubscriptionId=${mpSubscriptionId}. First payment dropped.`);
    return { success: false, error: "Subscription not found for first payment" };
  }

  const plan = await planRepository.findById(subscription.planId);
  if (!plan) return { success: false, error: "Plan not found" };

  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  // Create the first UserPlan for this subscription
  await userPlanRepository.create({
    userId: subscription.userId,
    planId: plan.id,
    centerId: subscription.centerId,
    subscriptionId: subscription.id,
    paymentStatus: "PAID",
    classesTotal: plan.maxReservations,
    validFrom: now,
    validUntil,
  });

  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/application/process-subscription-webhook.test.ts`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/application/process-subscription-webhook.ts lib/application/process-subscription-webhook.test.ts
git commit -m "feat: add subscription webhook processors for preapproval and authorized payment"
```

---

## Task 7: Extend Webhook Route to Handle Subscription Topics

**Files:**
- Modify: `lib/application/checkout.ts` (expand `processWebhookUseCase`)

The existing webhook handler only processes `payment` topics. We need to route `subscription_preapproval` and `subscription_authorized_payment` to the new handlers.

- [ ] **Step 1: Read current processWebhookUseCase**

File: `lib/application/checkout.ts:131-209`
Understand the existing flow: parse body → validate signature → check idempotency → fetch payment → update order.

- [ ] **Step 2: Add topic routing**

In `lib/application/checkout.ts`:

**a)** Add import at top of file (after existing imports, ~line 17):

```typescript
import {
  processPreapprovalWebhook,
  processAuthorizedPaymentWebhook,
} from "./process-subscription-webhook";
```

**b)** Inside `processWebhookUseCase`, insert subscription routing **after** the idempotency check (`if (already)` block, ~line 179) and **before** the payment fetch (`paymentProvider.getPayment`, ~line 183). Insert these lines:

```typescript
  // ── Subscription topic routing (new) ──────────────────────────────
  const type = body.type as string | undefined;

  if (type === "subscription_preapproval") {
    const result = await processPreapprovalWebhook(input.centerId, String(resourceId));
    await webhookEventRepository.markProcessed(input.centerId, requestId);
    return { success: result.success, alreadyProcessed: false, error: result.error };
  }

  if (type === "subscription_authorized_payment") {
    const result = await processAuthorizedPaymentWebhook(input.centerId, String(resourceId));
    await webhookEventRepository.markProcessed(input.centerId, requestId);
    return { success: result.success, alreadyProcessed: false, error: result.error };
  }
  // ── End subscription routing ──────────────────────────────────────
```

The existing `payment` flow (lines 183-209) remains unchanged as the default fallthrough.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add lib/application/checkout.ts
git commit -m "feat: route subscription webhook topics in processWebhookUseCase"
```

---

## Task 8: Subscription API Routes

**Files:**
- Create: `app/api/subscriptions/create/route.ts`
- Create: `app/api/subscriptions/cancel/route.ts`

- [ ] **Step 1: Write create subscription route**

```typescript
// app/api/subscriptions/create/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSubscriptionBodySchema } from "@/lib/dto/subscription-dto";
import { createSubscriptionCheckoutUseCase } from "@/lib/application/subscription-checkout";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = createSubscriptionBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const baseUrl = new URL(request.url).origin;

    const result = await createSubscriptionCheckoutUseCase({
      centerId: session.user.centerId,
      userId: session.user.id,
      planId: parsed.data.planId,
      baseUrl,
      payerEmail: session.user.email ?? "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ subscriptionUrl: result.subscriptionUrl });
  } catch (err) {
    console.error("[api/subscriptions/create]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write cancel subscription route**

```typescript
// app/api/subscriptions/cancel/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelSubscriptionBodySchema } from "@/lib/dto/subscription-dto";
import { subscriptionRepository, mercadopagoConfigRepository } from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = cancelSubscriptionBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const subscription = await subscriptionRepository.findById(parsed.data.subscriptionId);
    if (!subscription || subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    const config = await mercadopagoConfigRepository.findByCenterId(subscription.centerId);
    if (!config?.enabled) {
      return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 400 });
    }

    const result = await mercadoPagoSubscriptionAdapter.cancelPreapproval({
      accessToken: config.accessToken,
      mpSubscriptionId: subscription.mpSubscriptionId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await subscriptionRepository.updateStatus(subscription.id, "CANCELLED");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/subscriptions/cancel]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/subscriptions/create/route.ts app/api/subscriptions/cancel/route.ts
git commit -m "feat: add API routes for subscription create and cancel"
```

---

## Task 9: Email Builders for Subscription Events

**Files:**
- Modify: `lib/email/transactional.ts` (add 3 builders)

- [ ] **Step 1: Read existing email builders for pattern**

File: `lib/email/transactional.ts`
Follow the same inline HTML + `SendEmailDto` pattern used by existing builders (e.g., `buildReservationConfirmationEmail`).

- [ ] **Step 2: Add subscription email builders**

Add to `lib/email/transactional.ts` (follows the existing inline HTML pattern, returns `SendEmailDto`):

```typescript
// ─── Subscription emails ─────────────────────────────────────────────────────

export interface SubscriptionConfirmedData {
  toEmail: string;
  userName: string;
  planName: string;
  centerName: string;
  amountFormatted: string;
  nextChargeDate: string;
}

export function buildSubscriptionConfirmedEmail(data: SubscriptionConfirmedData): SendEmailDto {
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const subject = `Suscripción activa — ${data.planName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>${greeting},</p>
  <p>Tu suscripción a <strong>${data.planName}</strong> en ${data.centerName} está activa.</p>
  <p>Se cobrará <strong>${data.amountFormatted}</strong> automáticamente. Próximo cobro: <strong>${data.nextChargeDate}</strong>.</p>
  <p>Puedes cancelar en cualquier momento desde tu perfil.</p>
  <p>— ${SITE_NAME}</p>
</body>
</html>`;
  const text = [
    `${greeting},`,
    `Tu suscripción a ${data.planName} en ${data.centerName} está activa.`,
    `Cobro automático: ${data.amountFormatted}. Próximo cobro: ${data.nextChargeDate}.`,
    `— ${SITE_NAME}`,
  ].join("\n");
  return { from: DEFAULT_FROM, to: [data.toEmail], subject, html, text };
}

export interface SubscriptionRenewalData {
  toEmail: string;
  userName: string;
  planName: string;
  centerName: string;
  amountFormatted: string;
  nextChargeDate: string;
}

export function buildSubscriptionRenewalEmail(data: SubscriptionRenewalData): SendEmailDto {
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const subject = `Cobro realizado — ${data.planName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>${greeting},</p>
  <p>Se cobró <strong>${data.amountFormatted}</strong> por tu suscripción a <strong>${data.planName}</strong> en ${data.centerName}.</p>
  <p>Tu plan ha sido renovado. Próximo cobro: <strong>${data.nextChargeDate}</strong>.</p>
  <p>— ${SITE_NAME}</p>
</body>
</html>`;
  const text = [
    `${greeting},`,
    `Se cobró ${data.amountFormatted} por tu suscripción a ${data.planName} en ${data.centerName}.`,
    `Plan renovado. Próximo cobro: ${data.nextChargeDate}.`,
    `— ${SITE_NAME}`,
  ].join("\n");
  return { from: DEFAULT_FROM, to: [data.toEmail], subject, html, text };
}

export interface SubscriptionCancelledData {
  toEmail: string;
  userName: string;
  planName: string;
  centerName: string;
  accessUntil: string;
}

export function buildSubscriptionCancelledEmail(data: SubscriptionCancelledData): SendEmailDto {
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const subject = `Suscripción cancelada — ${data.planName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>${greeting},</p>
  <p>Tu suscripción a <strong>${data.planName}</strong> en ${data.centerName} ha sido cancelada.</p>
  <p>Tienes acceso hasta el <strong>${data.accessUntil}</strong>.</p>
  <p>Si fue un error, puedes volver a suscribirte desde la tienda.</p>
  <p>— ${SITE_NAME}</p>
</body>
</html>`;
  const text = [
    `${greeting},`,
    `Tu suscripción a ${data.planName} en ${data.centerName} ha sido cancelada.`,
    `Tienes acceso hasta el ${data.accessUntil}.`,
    `— ${SITE_NAME}`,
  ].join("\n");
  return { from: DEFAULT_FROM, to: [data.toEmail], subject, html, text };
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add lib/email/transactional.ts
git commit -m "feat: add subscription email builders (confirmed, renewal, cancelled)"
```

---

## Task 10: Enable "Suscribirme" Button in Tienda

**Files:**
- Create: `app/planes/SuscribirmeButton.tsx` (Client Component)
- Modify: `app/panel/tienda/page.tsx:134-138` (replace disabled button with Client Component)

**Note:** The tienda page is a Server Component (uses `auth()` and direct repository calls). We cannot add `onClick` handlers directly. Instead, extract a Client Component — same pattern as the existing `ComprarPlanButton.tsx`.

- [ ] **Step 1: Read existing `ComprarPlanButton.tsx` for pattern**

File: `app/planes/ComprarPlanButton.tsx`
Follow the same Client Component pattern.

- [ ] **Step 2: Create SuscribirmeButton Client Component**

```tsx
// app/planes/SuscribirmeButton.tsx
"use client";

import { useState } from "react";

interface SuscribirmeButtonProps {
  planId: string;
  recurringDiscountPercent?: number;
}

export default function SuscribirmeButton({ planId, recurringDiscountPercent }: SuscribirmeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.subscriptionUrl) {
        window.location.href = data.subscriptionUrl;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Redirigiendo…" : "Suscribirme"}
      {!loading && recurringDiscountPercent != null && recurringDiscountPercent > 0 && ` (${recurringDiscountPercent}% desc.)`}
    </button>
  );
}
```

- [ ] **Step 3: Replace disabled button in tienda page**

In `app/panel/tienda/page.tsx`, import `SuscribirmeButton` and replace the disabled `<button aria-disabled="true">` block (lines 134-138) with:

```tsx
import SuscribirmeButton from "@/app/planes/SuscribirmeButton";

// In the plan card where the disabled button was:
{canRecurring && (billingMode === "RECURRING" || billingMode === "BOTH") && (
  <SuscribirmeButton planId={plan.id} recurringDiscountPercent={recurringDiscountPercent} />
)}
```

- [ ] **Step 4: Test manually**

1. Start dev server: `npm run dev`
2. Go to `/panel/tienda`
3. Find a plan with `billingMode: RECURRING` or `BOTH`
4. Verify "Suscribirme" button is clickable (not disabled)
5. Click → should redirect to MercadoPago subscription authorization page

- [ ] **Step 5: Commit**

```bash
git add app/planes/SuscribirmeButton.tsx app/panel/tienda/page.tsx
git commit -m "feat: enable Suscribirme button in tienda as Client Component"
```

---

## Task 11: Add `findActiveBySubscriptionId` to UserPlan Repository

**Files:**
- Modify: `lib/ports/user-plan-repository.ts` (add method to interface)
- Modify: `lib/adapters/db/user-plan-repository.ts` (implement method)

Task 6 uses `userPlanRepository.findActiveBySubscriptionId()` to cascade subscription status changes to UserPlans. This method doesn't exist yet.

- [ ] **Step 1: Add method to IUserPlanRepository port**

In `lib/ports/user-plan-repository.ts`, add to the `IUserPlanRepository` interface:

```typescript
  /** Find the most recent ACTIVE or FROZEN UserPlan linked to a subscription */
  findActiveBySubscriptionId(subscriptionId: string): Promise<UserPlan | null>;
```

- [ ] **Step 2: Implement in Prisma adapter**

In `lib/adapters/db/user-plan-repository.ts`, add the implementation:

```typescript
  async findActiveBySubscriptionId(subscriptionId: string): Promise<UserPlan | null> {
    const row = await prisma.userPlan.findFirst({
      where: { subscriptionId, status: { in: ["ACTIVE", "FROZEN"] } },
      orderBy: { createdAt: "desc" },
    });
    return row ? toDomain(row) : null;
  },
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/ports/user-plan-repository.ts lib/adapters/db/user-plan-repository.ts
git commit -m "feat: add findActiveBySubscriptionId to UserPlan repository"
```

---

## Task 12: Final Integration Test + Typecheck

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run all unit tests**

Run: `npm run test`
Expected: All pass, coverage thresholds met

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 5: Manual E2E smoke test (if dev server available)**

1. Create a plan with `billingMode: BOTH` in admin panel
2. Go to tienda as student
3. Click "Suscribirme" → redirects to MP
4. Use MP test user to authorize subscription
5. Check webhook arrives and creates Subscription + UserPlan
6. Verify tienda shows "Activa" subscription badge

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes for recurring subscriptions"
```
