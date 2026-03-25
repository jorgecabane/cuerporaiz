# Perfil + Correos — Design Spec

## Goal

Give users control over their profile, show a summary of their plan/activity with links to existing pages, let them manage email notification preferences, and deliver all emails with a consistent branded template. Add 3 new transactional emails and redesign the 6 existing ones to match the brand.

## Architecture

Extends the existing hexagonal architecture. New `EmailPreference` model for per-user notification opt-in/out. New API routes for profile CRUD. Shared email base template function used by all builders. Vercel Cron Job for scheduled "plan por vencer" email.

---

## 1. User Profile Page (`/panel/mi-perfil`)

### Layout

3 tabs using URL search params or client-side state. Server Component page with Client Component forms.

### Tab: Mi perfil

Editable form with the fields already in the User model:

| Field | Type | Notes |
|-------|------|-------|
| name | text | Required |
| lastName | text | Optional |
| phone | text | Optional |
| rut | text | Optional, Chilean ID |
| birthday | date | Optional |
| sex | select (M/F/X) | Optional |
| imageUrl | file upload or URL | Optional, avatar |

Below the form: "Cambiar contraseña" section (current password + new password + confirm).

### Tab: Mi plan

Read-only summary card:
- Plan name, status badge (Activo/Vencido/Congelado)
- Classes used / total (or "Ilimitado")
- Valid until date
- If subscription: "Suscripción activa" badge + cancel link
- **CTA:** Link to `/panel/tienda` → "Ver planes"
- **CTA:** Link to `/panel/reservas` → "Mis reservas"

No data duplication — this tab shows summary and links out.

### Tab: Mis correos

Toggle switches per email type, all default ON:

| Toggle | Email type |
|--------|-----------|
| Recordatorio de clase | `classReminder` |
| Cupo liberado | `spotFreed` |
| Plan por vencer | `planExpiring` |
| Confirmación de reserva | `reservationConfirm` |
| Confirmación de compra | `purchaseConfirm` |

Saves via `PATCH /api/me/email-preferences`. Changes apply immediately.

---

## 2. API Routes

### `GET /api/me`

Returns current user profile data (all User fields except passwordHash and notes).

### `PATCH /api/me/profile`

Updates user profile fields. Zod-validated body. Only the user can update their own data.

Accepted fields: `name`, `lastName`, `phone`, `rut`, `birthday`, `sex`, `imageUrl`.

### `PATCH /api/me/password`

Changes password. Requires `currentPassword` + `newPassword`. Validates current password matches before updating.

### `PATCH /api/me/email-preferences`

Upserts `EmailPreference` record for the user+center pair. Body: partial object of boolean fields.

---

## 3. Database Changes

### New Model: EmailPreference

```prisma
model EmailPreference {
  id                  String  @id @default(cuid())
  userId              String
  centerId            String
  classReminder       Boolean @default(true)
  spotFreed           Boolean @default(true)
  planExpiring        Boolean @default(true)
  reservationConfirm  Boolean @default(true)
  purchaseConfirm     Boolean @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@unique([userId, centerId])
  @@index([userId])
  @@index([centerId])
}
```

Relations added to User and Center models.

---

## 4. New Emails

### 4a. Welcome Student (`buildWelcomeStudentEmail`)

- **Trigger:** Immediately after signup (`/api/auth/signup`)
- **Content:** Greeting, center name, link to panel dashboard, invitation to complete profile
- **Preference check:** None (always sent — it's the first email)

### 4b. Plan Expiring (`buildPlanExpiringEmail`)

- **Trigger:** Vercel Cron Job, daily at 8:00 AM Chile (11:00 UTC)
- **Content:** Plan name, expiry date, link to tienda to renew
- **Preference check:** `planExpiring` must be ON

### 4c. Purchase Confirmation (`buildPurchaseConfirmationEmail`)

- **Trigger:** When payment is approved in `activatePlanForOrder()`
- **Content:** Plan name, amount paid, validity period, link to tienda
- **Preference check:** `purchaseConfirm` must be ON

---

## 5. Email Template Redesign

### Shared Base Template

All emails (new + existing 6) use a shared `emailBaseLayout(content, options)` function that wraps content in consistent HTML:

- **Background:** Hueso/cream color matching `/panel` background (`#FAF8F5` or the closest CSS variable value)
- **Container:** max-width 600px, centered, white content card with subtle border-radius
- **Header:** Center name in `--color-primary` (#2D3B2A), text-based (no image logo), bold, sans-serif
- **Body:** Font sans-serif, color #333, line-height 1.6
- **CTA buttons:** Background `--color-secondary` (#B85C38), white text, border-radius 6px, generous padding
- **Footer:** "— {center name}", link to email preferences (`/panel/mi-perfil?tab=correos`), muted text color
- **Plain-text fallback:** Always included via `text` field in `SendEmailDto`

### Existing Emails to Redesign

These 6 currently use raw inline HTML without consistency. All will be wrapped in `emailBaseLayout`:

1. `buildReservationConfirmationEmail` — add preference check (`reservationConfirm`)
2. `buildClassReminderEmail` — add preference check (`classReminder`)
3. `buildSpotFreedEmail` — add preference check (`spotFreed`)
4. `buildTrialClassNoticeToTeacherEmail` — no preference check (internal, sent to teacher)
5. `buildPaymentFailedEmail` — no preference check (critical, always sent)
6. `buildWelcomeStaffEmail` — no preference check (onboarding, always sent)

---

## 6. Preference Check Helper

```typescript
// lib/application/check-email-preference.ts
async function shouldSendEmail(
  userId: string,
  centerId: string,
  emailType: keyof Omit<EmailPreference, 'id' | 'userId' | 'centerId' | 'createdAt' | 'updatedAt'>
): Promise<boolean>
```

- If no `EmailPreference` record exists → return `true` (all ON by default)
- If record exists → return the value of the specific field
- Used before every `sendEmailSafe()` call (except welcome/staff/payment-failed emails)

---

## 7. Vercel Cron Job

### Plan Expiring Cron

- **Route:** `app/api/cron/plan-expiring/route.ts`
- **Schedule:** `0 11 * * *` (daily at 11:00 UTC = 8:00 AM Chile)
- **Security:** Validates `Authorization: Bearer {CRON_SECRET}` header. Env var `CRON_SECRET`.
- **Logic:**
  1. Query all UserPlans where `validUntil` is between now+6 days and now+7 days, status ACTIVE
  2. For each, check `shouldSendEmail(userId, centerId, 'planExpiring')`
  3. If ON, send `buildPlanExpiringEmail` via `sendEmailSafe()`
  4. Return count of emails sent

### vercel.json config

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

---

## 8. Deliverables Summary

| Category | Items |
|----------|-------|
| **Pages** | `/panel/mi-perfil` (3 tabs) |
| **API routes** | `GET /api/me`, `PATCH /api/me/profile`, `PATCH /api/me/password`, `PATCH /api/me/email-preferences`, `GET /api/cron/plan-expiring` |
| **DB** | `EmailPreference` model + migration |
| **New emails** | Welcome student, plan expiring, purchase confirmation |
| **Redesigned emails** | 6 existing emails wrapped in shared base template |
| **Shared** | `emailBaseLayout()`, `shouldSendEmail()` helper |
| **Cron** | Vercel Cron for plan-expiring (daily 8 AM Chile) |
| **Docs** | Cron configuration guide |

---

## 9. Out of Scope

- Profile photo upload (imageUrl can be set as URL, no file upload infrastructure)
- Birthday email (can be added later as another cron)
- Weekly digest email
- Post-class feedback email
- Bulk admin email broadcasts
- Email delivery monitoring dashboard
