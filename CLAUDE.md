# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cuerpo Raíz is a multi-tenant yoga center management SaaS built with Next.js 16 (App Router), React 19, TypeScript, Prisma 7 (PostgreSQL/Supabase), and Tailwind CSS 4. It handles class scheduling, reservations, memberships, payments (MercadoPago), and video conferencing (Zoom/Google Meet) for yoga centers.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (webpack, port 3000) |
| `npm run build` | Build (`prisma generate && next build --webpack`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests with coverage (90% thresholds) |
| `npm run e2e` | E2E tests (Playwright) |
| `npm run e2e:ui` | E2E tests with Playwright UI |
| `npm run db:seed` | Seed database (`tsx prisma/seed.ts`) |

**Run a single test file:** `npx vitest run lib/domain/user-plan.test.ts`
**Run a single E2E test:** `npx playwright test e2e/reservations.spec.ts`
**Run E2E on alternate port:** `E2E_PORT=3001 npm run e2e`

## Architecture: Hexagonal (Ports & Adapters)

```
app/           → Presentation (Next.js pages + API routes)
  ├── api/     → REST endpoints (auth, reservations, checkout, webhooks, panel/*)
  └── panel/   → Admin dashboard (authenticated, server components by default)

lib/           → Business logic
  ├── domain/       → Pure entities & enums (no infrastructure deps)
  ├── application/  → Use cases (reserve-class, checkout, attendance, etc.)
  ├── ports/        → Adapter interfaces (repository contracts, email, payment)
  ├── adapters/     → Implementations
  │   ├── db/       → Prisma repositories
  │   ├── auth/     → NextAuth credentials provider
  │   ├── payment/  → MercadoPago adapter
  │   └── email/    → Resend adapter
  ├── dto/          → Zod-validated request/response DTOs (API boundaries)
  └── email/        → HTML email template builders

components/    → React components (ui/, panel/, sections/, shared/, providers/)
prisma/        → Schema (18 models), migrations, seed
e2e/           → Playwright E2E tests
docs/          → Architecture, design guidelines, setup docs
```

**Key principle:** Domain and application layers have zero infrastructure dependencies. Swapping a provider (e.g., Resend → SendGrid) means writing a new adapter — no business logic changes.

## Multi-Tenancy & Auth

- **Center** is the tenant. Users belong to centers via `UserCenterRole` (RBAC: ADMINISTRATOR, INSTRUCTOR, STUDENT).
- **Auth:** NextAuth 5 beta with credentials provider, JWT sessions (24h), cookie name `cuerporaiz.session`.
- **Middleware** (`middleware.ts`): protects `/panel/*` (redirect to login), redirects authenticated users away from `/auth/*`.

## Language & Copy Conventions

- **Code** is written in English (variables, functions, types, commits).
- **UI copy** is in **español chileno con tú** — NUNCA voseo argentino. Sí: "tienes / puedes / agrega". No: "tenés / podés / agregá".
- **Género**: usar **masculino genérico** (gender-neutral vía formas masculinas). Sí: "Ya inscrito", "el usuario", "los estudiantes". No: "Ya inscrita", "la alumna", "las estudiantes". Aplica a UI copy, emails y comentarios (los comments también, para no sembrar mala copy a futuro).
- **Plurales colectivos** ya neutros se mantienen: "Estudiantes", "Profesores", "Administración".
- Checklist al agregar copy nuevo:
  1. ¿Es chileno con tú (no voseo)?
  2. ¿Cada adjetivo/participio es masculino (o invariable)?
  3. ¿Las formas verbales en plural son neutras ("te esperamos", "los esperamos")?
- **Roles:** Never compare with string literals. Use helpers from `@/lib/domain/role`:
  ```ts
  import { isAdminRole, isStudentRole, isInstructorRole } from "@/lib/domain/role";
  ```

## Testing

- **Unit tests** (Vitest): cover `lib/domain/`, `lib/dto/`, `lib/email/`, and selected application files. 90% coverage thresholds on lines/functions/branches/statements.
- **E2E tests** (Playwright): full flows (login → create class → reserve → cancel → payment). Auth state reused via `storageState`.
- **Pre-commit hook** (Husky) runs: lint-staged → typecheck → test → e2e. All must pass. **Never use `--no-verify`.**
- **Important:** Stop `npm run dev` before committing — Next.js dev server locks `.next/dev/lock`, blocking the E2E server in pre-commit.

## Database

- **ORM:** Prisma 7 with `@prisma/adapter-pg`.
- **Migrations:** `npx prisma migrate dev` (local), see `docs/prisma-migraciones-supabase.md` for production.
- **Key models:** Center, User, UserCenterRole, LiveClassSeries, LiveClass, Plan, UserPlan, Reservation, Order, Subscription, ManualPayment, plus plugin configs (MercadoPago, Zoom, GoogleMeet).

## Design Tokens

All in `app/globals.css` as CSS variables. Always use tokens, never hardcode:
- Colors: `--color-primary` (#2D3B2A), `--color-secondary` (#B85C38), `--color-error`, etc.
- Spacing: base-8 system (`--space-4`, `--space-8`)
- Radii, shadows, durations, typography scales

## Timezone (mostrar fechas)

**Regla:** cualquier `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString` / `Intl.DateTimeFormat` que muestre una fecha o hora **DEBE** pasar `timeZone` explícito. Nunca dejar que el runtime lo infiera — Vercel corre en UTC y los displays sin TZ se corren horas (ej.: 10am Chile se ve como 2pm en panel admin).

La TZ a usar es `Center.timezone` (IANA, default `"America/Santiago"`). No hardcodear `"America/Santiago"` en componentes: tomá la TZ del centro y caé al default sólo en el helper central.

- **Server components / server actions:** importar de `@/lib/datetime/center-timezone`:
  ```ts
  import { getCenterTimezone, getPublicCenterTimezone, DEFAULT_TIMEZONE } from "@/lib/datetime/center-timezone";

  const tz = await getCenterTimezone(centerId);   // panel (tenés session.user.centerId)
  // o
  const tz = await getPublicCenterTimezone();      // páginas públicas (resuelve via env NEXT_PUBLIC_DEFAULT_CENTER_SLUG)
  ```
  Pasá `tz` a los formatters (signature `formatX(d: Date, tz: string)`) y a child server components vía prop.

- **Client components:** usar el hook:
  ```tsx
  import { useTimezone } from "@/components/providers/TimezoneProvider";

  const tz = useTimezone();
  d.toLocaleTimeString("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  ```
  El provider está wired en `app/layout.tsx` (TZ del centro público) y en `app/panel/layout.tsx` (TZ del centro logueado — override del panel).

- **Correos:** `getEmailBranding(centerId).timezone` ya resuelve la TZ del centro. Pasala a `formatLongDateTime / formatLongDate / formatTime` de `lib/email/format-datetime.ts` y a `buildGoogleCalendarUrl({ timeZone })`.

- **Excepciones legítimas (mantener `timeZone: "UTC"`):** campos que se guardan como UTC midnight semánticamente (no son timestamps reales). Ejemplos actuales: `client.birthday`, `Holiday.date`, `UserPlan.validFrom/validUntil/frozenUntil` (ver `formatDateOnlyUtc` en `app/panel/clientes/[id]/page.tsx` y `formatHolidayDateDisplay` en `lib/domain/holiday-date.ts`). Cuando dudes, mirá cómo se guarda el campo: si la app hizo `new Date(Date.UTC(y, m, d))`, es UTC; si fue `new Date()` o `validUntil = now + N días`, es timestamp y va con la TZ del centro.

Checklist al agregar un display de fecha nuevo:
1. ¿Pasaste `timeZone`?
2. ¿La TZ viene de `getCenterTimezone`/`useTimezone`, no de un literal?
3. Si es un "día civil" UTC-midnight, ¿pusiste `timeZone: "UTC"` explícito (no lo dejaste sin TZ)?

## Git Workflow

- Branch naming: `feature/nombre-descriptivo`, `fix/nombre`, `docs/nombre`
- Base branch: `main`
- Conventional commits recommended: `feat:`, `fix:`, `docs:`
- Subagents push branch and open PR via `gh pr create` when GitHub CLI is available.

## Key Business Logic Locations

- **Reservation flow:** `lib/application/reserve-class.ts` — validates spots, plan, duplicates, center policies
- **Series generation:** `lib/application/generate-series-instances.ts` — expands recurrence rules into LiveClass instances
- **Webhook idempotency:** `lib/application/verify-webhook-signature.ts` — HMAC + dedup via `MercadoPagoWebhookEvent`
- **Center policies:** `lib/domain/center-policy.ts` — cancelBeforeMinutes, maxNoShows, bookBeforeMinutes
- **Plan/UserPlan logic:** `lib/domain/user-plan.ts` — status, class tracking, freeze/unfreeze

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck → build → unit tests (coverage) → E2E (if DB secrets available). Node 20.
