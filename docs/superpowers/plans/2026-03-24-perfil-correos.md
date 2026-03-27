# Perfil + Correos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User profile page with 3 tabs (datos, plan, correos), shared branded email template, 3 new transactional emails, redesign of 6 existing emails, email preference model, and a Vercel Cron Job for plan-expiring reminders.

**Architecture:** Extends hexagonal architecture. New `EmailPreference` Prisma model. New API routes under `/api/me/*`. Shared `emailBaseLayout()` function wraps all email builders. Vercel Cron at `/api/cron/plan-expiring`. Profile page uses Server Component + Client Component forms (same pattern as `EditClientForm.tsx`).

**Tech Stack:** Next.js 16, React 19, Prisma 7, Zod, Vitest, Resend, Vercel Cron Jobs

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/email/base-layout.ts` | Shared branded email HTML wrapper (`emailBaseLayout`) |
| `lib/email/base-layout.test.ts` | Tests for email base layout |
| `lib/ports/email-preference-repository.ts` | Port: EmailPreference CRUD |
| `lib/adapters/db/email-preference-repository.ts` | Prisma implementation |
| `lib/domain/email-preference.ts` | Domain type + email type keys |
| `lib/application/check-email-preference.ts` | `shouldSendEmail()` helper |
| `lib/application/check-email-preference.test.ts` | Tests for preference check |
| `lib/dto/profile-dto.ts` | Zod schemas for profile/password/preferences API |
| `lib/dto/profile-dto.test.ts` | Tests for profile DTOs |
| `app/api/me/route.ts` | GET current user profile |
| `app/api/me/profile/route.ts` | PATCH update profile |
| `app/api/me/password/route.ts` | PATCH change password |
| `app/api/me/email-preferences/route.ts` | PATCH upsert email preferences |
| `app/api/cron/plan-expiring/route.ts` | Cron: send plan-expiring emails |
| `app/panel/mi-perfil/page.tsx` | Profile page (Server Component, 3 tabs) |
| `app/panel/mi-perfil/ProfileForm.tsx` | Client Component: edit profile form |
| `app/panel/mi-perfil/PasswordForm.tsx` | Client Component: change password form |
| `app/panel/mi-perfil/EmailPreferencesForm.tsx` | Client Component: toggle switches |
| `app/panel/mi-perfil/PlanSummaryCard.tsx` | Server Component: plan summary + links |
| `vercel.json` | Cron schedule configuration |
| `docs/cron-setup.md` | Cron configuration guide |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `EmailPreference` model + relations on User/Center |
| `lib/email/transactional.ts` | Wrap all 6 existing builders in `emailBaseLayout`, add 3 new builders |
| `lib/email/index.ts` | Export new builders + base layout |
| `lib/ports/index.ts` | Export `IEmailPreferenceRepository` |
| `lib/adapters/db/index.ts` | Export `emailPreferenceRepository` |
| `app/api/auth/signup/route.ts` | Send welcome email after signup |
| `lib/application/activate-plan.ts` | Send purchase confirmation email after plan activation |

---

## Task 1: Email Base Layout

**Files:**
- Create: `lib/email/base-layout.ts`
- Create: `lib/email/base-layout.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/email/base-layout.test.ts
import { describe, it, expect } from "vitest";
import { emailBaseLayout } from "./base-layout";

describe("emailBaseLayout", () => {
  it("wraps body content in branded HTML structure", () => {
    const html = emailBaseLayout({
      body: "<p>Hello world</p>",
      centerName: "Cuerpo Raíz",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<p>Hello world</p>");
    expect(html).toContain("Cuerpo Raíz");
  });

  it("uses cream background color #F5F0E9", () => {
    const html = emailBaseLayout({ body: "<p>Test</p>", centerName: "Test" });
    expect(html).toContain("#F5F0E9");
  });

  it("includes CTA button style with secondary color", () => {
    const html = emailBaseLayout({ body: "<p>Test</p>", centerName: "Test" });
    expect(html).toContain("#B85C38");
  });

  it("includes footer with center name", () => {
    const html = emailBaseLayout({ body: "<p>Test</p>", centerName: "Mi Centro" });
    expect(html).toContain("Mi Centro");
  });

  it("includes email preferences link when provided", () => {
    const html = emailBaseLayout({
      body: "<p>Test</p>",
      centerName: "Test",
      preferencesUrl: "https://app.com/panel/mi-perfil?tab=correos",
    });
    expect(html).toContain("mi-perfil?tab=correos");
    expect(html).toContain("Preferencias de correo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/email/base-layout.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// lib/email/base-layout.ts

export interface EmailLayoutOptions {
  body: string;
  centerName: string;
  preferencesUrl?: string;
}

/**
 * Shared branded email HTML wrapper. All transactional emails use this.
 * Design: cream background (#F5F0E9), white card, primary header (#2D3B2A),
 * secondary CTA buttons (#B85C38), minimal and clean.
 */
export function emailBaseLayout({ body, centerName, preferencesUrl }: EmailLayoutOptions): string {
  const footerLinks = preferencesUrl
    ? `<p style="margin-top: 24px;"><a href="${preferencesUrl}" style="color: #5C5A56; font-size: 12px;">Preferencias de correo</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0E9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F0E9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 0 16px; text-align: center;">
              <span style="font-size: 20px; font-weight: 700; color: #2D3B2A; letter-spacing: -0.02em;">${centerName}</span>
            </td>
          </tr>
          <!-- Body Card -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 12px; padding: 32px; color: #333333; font-size: 15px; line-height: 1.6;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center; color: #5C5A56; font-size: 13px;">
              <p style="margin: 0;">&mdash; ${centerName}</p>
              ${footerLinks}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Inline style for CTA buttons in email body */
export const EMAIL_CTA_STYLE = 'display: inline-block; background-color: #B85C38; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/email/base-layout.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/email/base-layout.ts lib/email/base-layout.test.ts
git commit -m "feat: add shared branded email base layout"
```

---

## Task 2: Redesign Existing Emails with Base Layout

**Files:**
- Modify: `lib/email/transactional.ts`
- Modify: `lib/email/index.ts`

- [ ] **Step 1: Read `lib/email/transactional.ts` fully**

Understand all 6 existing builders. Each currently builds raw inline HTML.

- [ ] **Step 2: Refactor all 6 builders to use `emailBaseLayout`**

Import `emailBaseLayout` and `EMAIL_CTA_STYLE` from `./base-layout`. For each builder:
- Extract the inner body content (everything inside `<body>`)
- Wrap it with `emailBaseLayout({ body, centerName: SITE_NAME })`
- Replace inline link styles with `EMAIL_CTA_STYLE` for CTAs
- Keep all existing data interfaces unchanged (backward compatible)
- Add `preferencesUrl` parameter to data interfaces where applicable

Pattern for each builder:
```typescript
export function buildReservationConfirmationEmail(data: ReservationConfirmationData): SendEmailDto {
  // ... existing logic for calendarUrl, greeting, etc.
  const body = `
    <p>${greeting},</p>
    <p>Tu reserva quedó confirmada.</p>
    <p><strong>${data.className}</strong><br>
    ${formattedDate}<br>
    ${data.location}</p>
    <p><a href="${calendarUrl}" style="${EMAIL_CTA_STYLE}">Añadir a Google Calendar</a></p>
    ${data.myReservationsUrl ? `<p><a href="${data.myReservationsUrl}" style="color: #2D3B2A;">Ver mis reservas</a></p>` : ""}
    <p>Nos vemos en la práctica.</p>`;

  const html = emailBaseLayout({ body, centerName: SITE_NAME });
  // ... text remains the same
  return { from: DEFAULT_FROM, to: [data.toEmail], subject, html, text };
}
```

- [ ] **Step 3: Export `emailBaseLayout` and `EMAIL_CTA_STYLE` from `lib/email/index.ts`**

```typescript
export { emailBaseLayout, EMAIL_CTA_STYLE, type EmailLayoutOptions } from "./base-layout";
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All existing tests pass (no interface changes)

- [ ] **Step 5: Commit**

```bash
git add lib/email/transactional.ts lib/email/index.ts
git commit -m "refactor: wrap all existing emails in branded base layout"
```

---

## Task 3: EmailPreference Domain + DB Model + Repository

**Files:**
- Create: `lib/domain/email-preference.ts`
- Create: `lib/ports/email-preference-repository.ts`
- Create: `lib/adapters/db/email-preference-repository.ts`
- Modify: `prisma/schema.prisma`
- Modify: `lib/ports/index.ts`
- Modify: `lib/adapters/db/index.ts`

- [ ] **Step 1: Create domain type**

```typescript
// lib/domain/email-preference.ts
export interface EmailPreference {
  id: string;
  userId: string;
  centerId: string;
  classReminder: boolean;
  spotFreed: boolean;
  planExpiring: boolean;
  reservationConfirm: boolean;
  purchaseConfirm: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Keys that can be toggled by the user */
export type EmailPreferenceType = keyof Pick<
  EmailPreference,
  "classReminder" | "spotFreed" | "planExpiring" | "reservationConfirm" | "purchaseConfirm"
>;

export const EMAIL_PREFERENCE_LABELS: Record<EmailPreferenceType, string> = {
  classReminder: "Recordatorio de clase",
  spotFreed: "Cupo liberado",
  planExpiring: "Plan por vencer",
  reservationConfirm: "Confirmación de reserva",
  purchaseConfirm: "Confirmación de compra",
};
```

- [ ] **Step 2: Add Prisma model**

Add to `prisma/schema.prisma`:

```prisma
model EmailPreference {
  id                  String   @id @default(cuid())
  userId              String
  centerId            String
  classReminder       Boolean  @default(true)
  spotFreed           Boolean  @default(true)
  planExpiring        Boolean  @default(true)
  reservationConfirm  Boolean  @default(true)
  purchaseConfirm     Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@unique([userId, centerId])
  @@index([userId])
  @@index([centerId])
}
```

Add `emailPreferences EmailPreference[]` relation to both `User` and `Center` models.

Create migration manually (shadow DB issue with Supabase):

```sql
-- prisma/migrations/YYYYMMDDHHMMSS_add_email_preference/migration.sql
CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "classReminder" BOOLEAN NOT NULL DEFAULT true,
    "spotFreed" BOOLEAN NOT NULL DEFAULT true,
    "planExpiring" BOOLEAN NOT NULL DEFAULT true,
    "reservationConfirm" BOOLEAN NOT NULL DEFAULT true,
    "purchaseConfirm" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailPreference_userId_centerId_key" ON "EmailPreference"("userId", "centerId");
CREATE INDEX "EmailPreference_userId_idx" ON "EmailPreference"("userId");
CREATE INDEX "EmailPreference_centerId_idx" ON "EmailPreference"("centerId");

ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Run: `npx prisma migrate deploy && npx prisma generate`

- [ ] **Step 3: Create repository port**

```typescript
// lib/ports/email-preference-repository.ts
import type { EmailPreference, EmailPreferenceType } from "@/lib/domain/email-preference";

export interface UpsertEmailPreferenceInput {
  userId: string;
  centerId: string;
  classReminder?: boolean;
  spotFreed?: boolean;
  planExpiring?: boolean;
  reservationConfirm?: boolean;
  purchaseConfirm?: boolean;
}

export interface IEmailPreferenceRepository {
  findByUserAndCenter(userId: string, centerId: string): Promise<EmailPreference | null>;
  upsert(input: UpsertEmailPreferenceInput): Promise<EmailPreference>;
  isEnabled(userId: string, centerId: string, type: EmailPreferenceType): Promise<boolean>;
}
```

- [ ] **Step 4: Create Prisma adapter**

```typescript
// lib/adapters/db/email-preference-repository.ts
import { prisma } from "./prisma";
import type { IEmailPreferenceRepository, UpsertEmailPreferenceInput } from "@/lib/ports/email-preference-repository";
import type { EmailPreference, EmailPreferenceType } from "@/lib/domain/email-preference";

export const emailPreferenceRepository: IEmailPreferenceRepository = {
  async findByUserAndCenter(userId: string, centerId: string): Promise<EmailPreference | null> {
    return prisma.emailPreference.findUnique({
      where: { userId_centerId: { userId, centerId } },
    });
  },

  async upsert(input: UpsertEmailPreferenceInput): Promise<EmailPreference> {
    const { userId, centerId, ...prefs } = input;
    return prisma.emailPreference.upsert({
      where: { userId_centerId: { userId, centerId } },
      create: { userId, centerId, ...prefs },
      update: prefs,
    });
  },

  async isEnabled(userId: string, centerId: string, type: EmailPreferenceType): Promise<boolean> {
    const pref = await prisma.emailPreference.findUnique({
      where: { userId_centerId: { userId, centerId } },
      select: { [type]: true },
    });
    if (!pref) return true; // Default: all ON
    return pref[type] as boolean;
  },
};
```

- [ ] **Step 5: Export from index files**

Add to `lib/ports/index.ts`:
```typescript
export type { IEmailPreferenceRepository, UpsertEmailPreferenceInput } from "./email-preference-repository";
```

Add to `lib/adapters/db/index.ts`:
```typescript
export { emailPreferenceRepository } from "./email-preference-repository";
```

- [ ] **Step 6: Run typecheck + tests**

Run: `npm run typecheck && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git add lib/domain/email-preference.ts lib/ports/email-preference-repository.ts lib/adapters/db/email-preference-repository.ts prisma/schema.prisma prisma/migrations/ lib/ports/index.ts lib/adapters/db/index.ts
git commit -m "feat: add EmailPreference model, domain types, and repository"
```

---

## Task 4: shouldSendEmail Helper

**Files:**
- Create: `lib/application/check-email-preference.ts`
- Create: `lib/application/check-email-preference.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/application/check-email-preference.test.ts
import { describe, it, expect } from "vitest";
import { shouldSendEmailPure } from "./check-email-preference";
import type { EmailPreference } from "@/lib/domain/email-preference";

const basePref: EmailPreference = {
  id: "1", userId: "u1", centerId: "c1",
  classReminder: true, spotFreed: true, planExpiring: true,
  reservationConfirm: true, purchaseConfirm: true,
  createdAt: new Date(), updatedAt: new Date(),
};

describe("shouldSendEmailPure", () => {
  it("returns true when no preference record exists (null)", () => {
    expect(shouldSendEmailPure(null, "classReminder")).toBe(true);
  });

  it("returns true when preference is enabled", () => {
    expect(shouldSendEmailPure(basePref, "classReminder")).toBe(true);
  });

  it("returns false when preference is disabled", () => {
    const pref = { ...basePref, classReminder: false };
    expect(shouldSendEmailPure(pref, "classReminder")).toBe(false);
  });

  it("checks correct field for each type", () => {
    const pref = { ...basePref, spotFreed: false, planExpiring: true };
    expect(shouldSendEmailPure(pref, "spotFreed")).toBe(false);
    expect(shouldSendEmailPure(pref, "planExpiring")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run lib/application/check-email-preference.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// lib/application/check-email-preference.ts
import { emailPreferenceRepository } from "@/lib/adapters/db";
import type { EmailPreference, EmailPreferenceType } from "@/lib/domain/email-preference";

/** Pure function for testing — checks preference without DB */
export function shouldSendEmailPure(
  pref: EmailPreference | null,
  type: EmailPreferenceType
): boolean {
  if (!pref) return true;
  return pref[type];
}

/** Async version that queries the DB */
export async function shouldSendEmail(
  userId: string,
  centerId: string,
  type: EmailPreferenceType
): Promise<boolean> {
  return emailPreferenceRepository.isEnabled(userId, centerId, type);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/application/check-email-preference.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/application/check-email-preference.ts lib/application/check-email-preference.test.ts
git commit -m "feat: add shouldSendEmail preference check helper"
```

---

## Task 5: Profile DTOs

**Files:**
- Create: `lib/dto/profile-dto.ts`
- Create: `lib/dto/profile-dto.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/dto/profile-dto.test.ts
import { describe, it, expect } from "vitest";
import { updateProfileSchema, changePasswordSchema, updateEmailPreferencesSchema } from "./profile-dto";

describe("updateProfileSchema", () => {
  it("accepts valid profile update", () => {
    const result = updateProfileSchema.safeParse({ name: "Jorge", phone: "+56912345678" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old12345",
      newPassword: "new12345",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old12345",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateEmailPreferencesSchema", () => {
  it("accepts partial boolean updates", () => {
    const result = updateEmailPreferencesSchema.safeParse({ classReminder: false });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean values", () => {
    const result = updateEmailPreferencesSchema.safeParse({ classReminder: "yes" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

- [ ] **Step 3: Write DTOs**

```typescript
// lib/dto/profile-dto.ts
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  rut: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(), // ISO date string
  sex: z.enum(["M", "F", "X"]).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateEmailPreferencesSchema = z.object({
  classReminder: z.boolean().optional(),
  spotFreed: z.boolean().optional(),
  planExpiring: z.boolean().optional(),
  reservationConfirm: z.boolean().optional(),
  purchaseConfirm: z.boolean().optional(),
});
export type UpdateEmailPreferencesInput = z.infer<typeof updateEmailPreferencesSchema>;
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add lib/dto/profile-dto.ts lib/dto/profile-dto.test.ts
git commit -m "feat: add profile, password, and email preference DTOs"
```

---

## Task 6: Profile API Routes

**Files:**
- Create: `app/api/me/route.ts`
- Create: `app/api/me/profile/route.ts`
- Create: `app/api/me/password/route.ts`
- Create: `app/api/me/email-preferences/route.ts`

All routes use `import { auth } from "@/auth"` and `session.user.id` / `session.user.centerId`.

- [ ] **Step 1: Write GET /api/me**

```typescript
// app/api/me/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userRepository } from "@/lib/adapters/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await userRepository.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Exclude passwordHash and notes (admin-only)
  const { notes, ...profile } = user as Record<string, unknown>;
  return NextResponse.json(profile);
}
```

Note: `userRepository.findById` returns the domain `User` which doesn't include `passwordHash`. Read the actual return to confirm and adjust.

- [ ] **Step 2: Write PATCH /api/me/profile**

```typescript
// app/api/me/profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/adapters/db/prisma";
import { updateProfileSchema } from "@/lib/dto/profile-dto";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      if (key === "birthday" && typeof value === "string") {
        data[key] = new Date(value);
      } else {
        data[key] = value;
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, lastName: true, phone: true, rut: true, birthday: true, sex: true, imageUrl: true },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 3: Write PATCH /api/me/password**

```typescript
// app/api/me/password/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/adapters/db/prisma";
import { authService } from "@/lib/adapters/auth";
import { changePasswordSchema } from "@/lib/dto/profile-dto";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const valid = await authService.verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  const newHash = await authService.hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Write PATCH /api/me/email-preferences**

```typescript
// app/api/me/email-preferences/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { emailPreferenceRepository } from "@/lib/adapters/db";
import { updateEmailPreferencesSchema } from "@/lib/dto/profile-dto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const prefs = await emailPreferenceRepository.findByUserAndCenter(
    session.user.id,
    session.user.centerId
  );

  // If no record, return all defaults (true)
  return NextResponse.json(prefs ?? {
    classReminder: true,
    spotFreed: true,
    planExpiring: true,
    reservationConfirm: true,
    purchaseConfirm: true,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = updateEmailPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const result = await emailPreferenceRepository.upsert({
    userId: session.user.id,
    centerId: session.user.centerId,
    ...parsed.data,
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add app/api/me/route.ts app/api/me/profile/route.ts app/api/me/password/route.ts app/api/me/email-preferences/route.ts
git commit -m "feat: add profile API routes (GET me, PATCH profile/password/preferences)"
```

---

## Task 7: New Email Builders (Welcome, Plan Expiring, Purchase Confirmation)

**Files:**
- Modify: `lib/email/transactional.ts`
- Modify: `lib/email/index.ts`

- [ ] **Step 1: Read current transactional.ts to find insertion point**

- [ ] **Step 2: Add 3 new builders**

Add to `lib/email/transactional.ts`, using `emailBaseLayout` and `EMAIL_CTA_STYLE`:

```typescript
// ─── Welcome student ─────────────────────────────────────────────────────
export interface WelcomeStudentData {
  toEmail: string;
  userName: string;
  centerName: string;
  dashboardUrl: string;
  profileUrl: string;
}

export function buildWelcomeStudentEmail(data: WelcomeStudentData): SendEmailDto {
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Te damos la bienvenida a <strong>${data.centerName}</strong>.</p>
    <p>Desde tu panel puedes reservar clases, ver tu plan y gestionar tu cuenta.</p>
    <p><a href="${data.dashboardUrl}" style="${EMAIL_CTA_STYLE}">Ir al panel</a></p>
    <p style="margin-top: 16px;"><a href="${data.profileUrl}" style="color: #2D3B2A;">Completar mi perfil</a></p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = `Hola ${data.userName}, bienvenido/a a ${data.centerName}. Ir al panel: ${data.dashboardUrl}`;
  return { from: DEFAULT_FROM, to: [data.toEmail], subject: `Bienvenido/a a ${data.centerName}`, html, text };
}

// ─── Plan expiring ───────────────────────────────────────────────────────
export interface PlanExpiringData {
  toEmail: string;
  userName: string;
  centerName: string;
  planName: string;
  expiryDate: string;
  tiendaUrl: string;
  preferencesUrl: string;
}

export function buildPlanExpiringEmail(data: PlanExpiringData): SendEmailDto {
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Tu plan <strong>${data.planName}</strong> vence el <strong>${data.expiryDate}</strong>.</p>
    <p>Renueva para seguir disfrutando de tus clases.</p>
    <p><a href="${data.tiendaUrl}" style="${EMAIL_CTA_STYLE}">Renovar plan</a></p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName, preferencesUrl: data.preferencesUrl });
  const text = `Hola ${data.userName}, tu plan ${data.planName} vence el ${data.expiryDate}. Renueva en: ${data.tiendaUrl}`;
  return { from: DEFAULT_FROM, to: [data.toEmail], subject: `Tu plan ${data.planName} vence pronto`, html, text };
}

// ─── Purchase confirmation ───────────────────────────────────────────────
export interface PurchaseConfirmationData {
  toEmail: string;
  userName: string;
  centerName: string;
  planName: string;
  amountFormatted: string;
  validUntil: string;
  tiendaUrl: string;
  preferencesUrl: string;
}

export function buildPurchaseConfirmationEmail(data: PurchaseConfirmationData): SendEmailDto {
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Tu compra fue confirmada.</p>
    <p><strong>${data.planName}</strong><br>
    Monto: ${data.amountFormatted}<br>
    Vigencia hasta: ${data.validUntil}</p>
    <p><a href="${data.tiendaUrl}" style="${EMAIL_CTA_STYLE}">Ver mi plan</a></p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName, preferencesUrl: data.preferencesUrl });
  const text = `Hola ${data.userName}, tu compra de ${data.planName} (${data.amountFormatted}) fue confirmada. Vigencia hasta ${data.validUntil}.`;
  return { from: DEFAULT_FROM, to: [data.toEmail], subject: `Compra confirmada: ${data.planName}`, html, text };
}
```

- [ ] **Step 3: Export from index.ts**

Add the 3 new builders + their data types to `lib/email/index.ts`.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add lib/email/transactional.ts lib/email/index.ts
git commit -m "feat: add welcome, plan-expiring, and purchase-confirmation email builders"
```

---

## Task 8: Wire Emails into Signup + Activate Plan

**Files:**
- Modify: `app/api/auth/signup/route.ts`
- Modify: `lib/application/activate-plan.ts`

- [ ] **Step 1: Send welcome email after signup**

In `app/api/auth/signup/route.ts`, after `await userRepository.addRole(...)` and before the response, add:

```typescript
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildWelcomeStudentEmail } from "@/lib/email";

// After addRole, before return
const baseUrl = new URL(request.url).origin;
sendEmailSafe(buildWelcomeStudentEmail({
  toEmail: email,
  userName: name ?? email.split("@")[0],
  centerName: center.name,
  dashboardUrl: `${baseUrl}/panel`,
  profileUrl: `${baseUrl}/panel/mi-perfil`,
}));
```

- [ ] **Step 2: Send purchase confirmation after plan activation**

In `lib/application/activate-plan.ts`, after creating the UserPlan and before `return`, add:

```typescript
import { sendEmailSafe } from "./send-email";
import { buildPurchaseConfirmationEmail } from "@/lib/email";
import { shouldSendEmail } from "./check-email-preference";
import { userRepository, centerRepository } from "@/lib/adapters/db";

// After userPlan creation
const canSend = await shouldSendEmail(userId, centerId, "purchaseConfirm");
if (canSend) {
  const [buyer, center] = await Promise.all([
    userRepository.findById(userId),
    centerRepository.findById(centerId),
  ]);
  if (buyer && center) {
    const validUntilStr = validUntil
      ? validUntil.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })
      : "Sin vencimiento";
    sendEmailSafe(buildPurchaseConfirmationEmail({
      toEmail: buyer.email,
      userName: buyer.name ?? buyer.email.split("@")[0],
      centerName: center.name,
      planName: plan.name,
      amountFormatted: `$${plan.amountCents.toLocaleString("es-CL")}`,
      validUntil: validUntilStr,
      tiendaUrl: `${process.env.NEXTAUTH_URL ?? ""}/panel/tienda`,
      preferencesUrl: `${process.env.NEXTAUTH_URL ?? ""}/panel/mi-perfil?tab=correos`,
    }));
  }
}
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/signup/route.ts lib/application/activate-plan.ts
git commit -m "feat: wire welcome and purchase confirmation emails"
```

---

## Task 9: Vercel Cron — Plan Expiring

**Files:**
- Create: `app/api/cron/plan-expiring/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Write cron route**

```typescript
// app/api/cron/plan-expiring/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildPlanExpiringEmail } from "@/lib/email";
import { shouldSendEmail } from "@/lib/application/check-email-preference";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sixDays = new Date(now);
  sixDays.setDate(sixDays.getDate() + 6);
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const expiringPlans = await prisma.userPlan.findMany({
    where: {
      status: "ACTIVE",
      validUntil: { gte: sixDays, lte: sevenDays },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: { select: { name: true } },
      center: { select: { id: true, name: true } },
    },
  });

  let sent = 0;
  const baseUrl = process.env.NEXTAUTH_URL ?? "";

  for (const up of expiringPlans) {
    const canSend = await shouldSendEmail(up.userId, up.centerId, "planExpiring");
    if (!canSend) continue;

    const expiryDate = up.validUntil!.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });

    sendEmailSafe(buildPlanExpiringEmail({
      toEmail: up.user.email,
      userName: up.user.name ?? up.user.email.split("@")[0],
      centerName: up.center.name,
      planName: up.plan.name,
      expiryDate,
      tiendaUrl: `${baseUrl}/panel/tienda`,
      preferencesUrl: `${baseUrl}/panel/mi-perfil?tab=correos`,
    }));
    sent++;
  }

  return NextResponse.json({ ok: true, sent, total: expiringPlans.length });
}
```

- [ ] **Step 2: Create or update vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/plan-expiring",
      "schedule": "0 11 * * *"
    }
  ]
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/plan-expiring/route.ts vercel.json
git commit -m "feat: add Vercel Cron for plan-expiring email reminders"
```

---

## Task 10: Profile Page — Mi perfil tab (Server + Client Component)

**Files:**
- Create: `app/panel/mi-perfil/page.tsx`
- Create: `app/panel/mi-perfil/ProfileForm.tsx`
- Create: `app/panel/mi-perfil/PasswordForm.tsx`

- [ ] **Step 1: Read `app/panel/clientes/[id]/EditClientForm.tsx` for form pattern**

Follow the same pattern: `"use client"`, `useTransition`, form with fetch to API route.

- [ ] **Step 2: Create ProfileForm client component**

```tsx
// app/panel/mi-perfil/ProfileForm.tsx
"use client";
// Editable form for: name, lastName, phone, rut, birthday, sex, imageUrl
// Calls PATCH /api/me/profile
// Uses same input styles as EditClientForm
// Shows success/error feedback
```

Full implementation: read current user data from props, form inputs for each field, submit via fetch to `/api/me/profile`, show success toast or error.

- [ ] **Step 3: Create PasswordForm client component**

```tsx
// app/panel/mi-perfil/PasswordForm.tsx
"use client";
// 3 fields: currentPassword, newPassword, confirmPassword
// Client-side validation: newPassword === confirmPassword
// Calls PATCH /api/me/password
```

- [ ] **Step 4: Create page.tsx (Server Component with tabs)**

```tsx
// app/panel/mi-perfil/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { userRepository } from "@/lib/adapters/db";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
// Tabs via searchParams: ?tab=perfil (default) | plan | correos

export default async function MiPerfilPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/mi-perfil");

  const { tab = "perfil" } = await searchParams;
  const user = await userRepository.findById(session.user.id);
  if (!user) redirect("/auth/login");

  // Tab navigation + content render based on tab param
  // Tab "perfil": <ProfileForm user={user} /> + <PasswordForm />
  // Tab "plan": <PlanSummaryCard /> (Task 11)
  // Tab "correos": <EmailPreferencesForm /> (Task 12)
}
```

- [ ] **Step 5: Run typecheck + test manually**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add app/panel/mi-perfil/page.tsx app/panel/mi-perfil/ProfileForm.tsx app/panel/mi-perfil/PasswordForm.tsx
git commit -m "feat: add mi-perfil page with profile and password forms"
```

---

## Task 11: Profile Page — Mi plan tab

**Files:**
- Create: `app/panel/mi-perfil/PlanSummaryCard.tsx`
- Modify: `app/panel/mi-perfil/page.tsx` (wire tab)

- [ ] **Step 1: Create PlanSummaryCard**

Server component that receives `userId` and `centerId`. Queries active UserPlan + Plan. Shows:
- Plan name, status badge, classes used/total, validUntil
- If subscription: badge + cancel info
- CTAs: link to `/panel/tienda`, link to `/panel/reservas`
- If no plan: "No tienes un plan activo" + link to tienda

- [ ] **Step 2: Wire into page.tsx tab="plan"**

- [ ] **Step 3: Run typecheck**

- [ ] **Step 4: Commit**

```bash
git add app/panel/mi-perfil/PlanSummaryCard.tsx app/panel/mi-perfil/page.tsx
git commit -m "feat: add plan summary tab to mi-perfil page"
```

---

## Task 12: Profile Page — Mis correos tab

**Files:**
- Create: `app/panel/mi-perfil/EmailPreferencesForm.tsx`
- Modify: `app/panel/mi-perfil/page.tsx` (wire tab)

- [ ] **Step 1: Create EmailPreferencesForm client component**

Toggle switches for each email type. Fetches current prefs from `GET /api/me/email-preferences`. On toggle change, calls `PATCH /api/me/email-preferences` with the changed field. Uses `EMAIL_PREFERENCE_LABELS` for display names.

- [ ] **Step 2: Wire into page.tsx tab="correos"**

- [ ] **Step 3: Run typecheck**

- [ ] **Step 4: Commit**

```bash
git add app/panel/mi-perfil/EmailPreferencesForm.tsx app/panel/mi-perfil/page.tsx
git commit -m "feat: add email preferences tab to mi-perfil page"
```

---

## Task 13: Cron Configuration Doc

**Files:**
- Create: `docs/cron-setup.md`

- [ ] **Step 1: Write cron configuration guide**

Document:
- What crons exist and what they do
- How to set up `CRON_SECRET` env var in Vercel
- How `vercel.json` cron config works
- How to test locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/plan-expiring`
- How to add new crons in the future

- [ ] **Step 2: Commit**

```bash
git add docs/cron-setup.md
git commit -m "docs: add cron configuration guide"
```

---

## Task 14: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 2: Run all unit tests**

Run: `npm run test`

- [ ] **Step 3: Run lint**

Run: `npm run lint`

- [ ] **Step 4: Run build**

Run: `npm run build`

- [ ] **Step 5: Manual smoke test**

1. Go to `/panel/mi-perfil` — verify 3 tabs render
2. Edit profile fields → save → verify changes persist
3. Change password → logout → login with new password
4. Toggle email preferences → verify saved
5. Tab "Mi plan" shows plan summary with links
6. Create new account → verify welcome email received
7. Test cron locally: `curl -H "Authorization: Bearer CRON_SECRET" http://localhost:3000/api/cron/plan-expiring`
