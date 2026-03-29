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
- **UI copy** is in Spanish (Chilean tú form): "tienes", "puedes", "agrega" — never voseo ("tenés", "podés").
- **Labels** are gender-neutral: "Estudiantes", "Profesores", "Administración".
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
