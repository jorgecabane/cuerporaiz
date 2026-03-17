# Panel Pagos + Depósitos Profesoras Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hacer `/panel/pagos` paginado (20 por página) con filtros por email y fecha (presets + rango) y switch `Checkout/Manual`, y agregar datos bancarios por profesora reutilizando la UI del plugin de transferencia.

**Architecture:** Paginación y filtros server-side mediante `searchParams` y repositorios Prisma, consultando `Order` (checkout) o `ManualPayment` (manual) según `type`. Para profesoras, crear modelo `InstructorBankAccount` por `(centerId,userId)` y extraer un componente reutilizable `BankAccountFields` usado por el plugin y por la sección de profesoras.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Prisma, Vitest (coverage), Playwright (E2E).

---

### Task 1: Crear rama de trabajo y sanear estado

**Files:**
- Modify: ninguno (solo git)

**Step 1: Crear rama**

Run:

```bash
git checkout -b feature/panel-pagos-filtros
```

Expected: branch creada desde el estado actual.

**Step 2: Verificar que no hay `next dev` corriendo**

Expected: no hay servidor bloqueando `.next/dev/lock`.

---

### Task 2: Modelar filtros y paginación para `/panel/pagos`

**Files:**
- Modify: `app/panel/pagos/page.tsx`
- Create: `app/panel/pagos/payments-query.ts` (helpers parse/searchParams + construcción de filtros)
- Modify: `lib/adapters/db/order-repository.ts`
- Modify: `lib/adapters/db/manual-payment-repository.ts` (si existe) o crear repositorio equivalente
- Modify: `lib/ports/order-repository.ts`
- Modify/Create: `lib/ports/manual-payment-repository.ts`

**Step 1: Escribir tests unitarios para parseo de filtros**

Create tests:

- `lib/panel/payments-query.test.ts` (o ruta equivalente) cubriendo:
  - `type` default = `checkout`
  - `email` trimming + lower
  - presets (`today`, `last7`, `thisMonth`) generan `from/to`
  - `custom` respeta `from/to`

Run:

```bash
npm run test -- lib/panel/payments-query.test.ts
```

Expected: FAIL (helpers no existen).

**Step 2: Implementar helpers mínimos**

Create:
- `app/panel/pagos/payments-query.ts` con:
  - `parsePaymentsSearchParams(searchParams)` → `{ type, email, datePreset, from, to, status, cursor }`
  - `computeDateRange({datePreset, from, to})` → `{ fromDate, toDate } | null`

**Step 3: Implementar queries paginadas por tipo**

- Para `checkout`:
  - Nuevo método repo: `findPageByCenterId(centerId, { status?, email?, from?, to?, cursor?, take })`
  - Query Prisma con `where.centerId`, `where.status?`, `where.createdAt` range, join a `User` para filtrar por `email` (case-insensitive), y `orderBy: [{ createdAt: "desc" }, { id: "desc" }]`.
  - Incluir `user.email` y `plan.name` (o resolver en 1 fetch por ids de la página).

- Para `manual`:
  - Crear repo o método equivalente sobre `ManualPayment` con:
    - rango por `paidAt`
    - filtro por `user.email`
    - ordenar por `paidAt desc`, `id desc`

**Step 4: Conectar UI**

- En `app/panel/pagos/page.tsx`:
  - Renderizar switch `Checkout/Manual` (controlado por querystring).
  - Barra de filtros: email + presets + rango custom + (checkout) status.
  - Tabla distinta según tipo.
  - Componente de paginación “Anterior/Siguiente” (si solo implementamos “Siguiente”, mostrar “Volver al inicio” en lugar de “Anterior”).

**Step 5: Ejecutar unit tests**

Run:

```bash
npm run test
```

Expected: PASS.

**Step 6: Commit**

```bash
git add app/panel/pagos/page.tsx app/panel/pagos/payments-query.ts lib/**/order-repository.ts lib/**/manual-payment-*.ts lib/**/ports/*payments* lib/**/payments-query.test.ts
git commit -m "feat: paginate and filter panel pagos"
```

---

### Task 3: Extraer UI reutilizable de datos bancarios

**Files:**
- Modify: `app/panel/plugins/transferencia/BankTransferForm.tsx`
- Create: `app/panel/plugins/transferencia/BankAccountFields.tsx` (o ruta compartida en `components/`)

**Step 1: Escribir test (opcional)**

Como es UI, test unit no obligatorio; se valida por typecheck + E2E existentes.

**Step 2: Extraer componente**

- Mover `BANKS` y `ACCOUNT_TYPES` a un módulo compartido.
- `BankAccountFields` recibe `defaultValues` y un flag `disabled`.
- `BankTransferForm` lo usa sin cambiar funcionalidad.

**Step 3: Typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

**Step 4: Commit**

```bash
git add app/panel/plugins/transferencia/BankTransferForm.tsx app/panel/plugins/transferencia/BankAccountFields.tsx
git commit -m "refactor: reuse bank account fields UI"
```

---

### Task 4: Modelo y CRUD de datos bancarios por profesora

**Files:**
- Modify: `prisma/schema.prisma`
- Create/Modify: `lib/adapters/db/instructor-bank-account-repository.ts`
- Create/Modify: `lib/ports/instructor-bank-account-repository.ts`
- Modify: `app/panel/profesoras/[id]/editar/page.tsx`
- Modify/Create: `app/panel/profesoras/BankAccountSection.tsx`
- Modify: `app/panel/profesoras/actions.ts`

**Step 1: Migración Prisma**

- Agregar modelo `InstructorBankAccount` con `@@unique([centerId, userId])`.

Run:

```bash
npx prisma migrate dev -n instructor_bank_account
```

Expected: migration creada y aplicada.

**Step 2: Repo + server action**

- `saveInstructorBankData` hace upsert y valida admin.

**Step 3: UI en editar profesora**

- Mostrar sección con `BankAccountFields` y botón “Guardar datos bancarios”.
- Mensaje “Guardado” al completar.

**Step 4: Unit tests (si aplica)**

- Testear repo/mapper si hay lógica no trivial.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/**/instructor-bank-account* app/panel/profesoras/**
git commit -m "feat: add instructor bank account data"
```

---

### Task 5: Actualizar docs de diseño (si hubo desviaciones) y commitear docs

**Files:**
- Modify: `docs/plans/2026-03-17-panel-pagos-profesoras-design.md` (solo si cambió algo)
- Create: `docs/plans/2026-03-17-panel-pagos-profesoras-plan.md`

**Step 1: Commit docs**

```bash
git add docs/plans/2026-03-17-panel-pagos-profesoras-design.md docs/plans/2026-03-17-panel-pagos-profesoras-plan.md
git commit -m "docs: plan panel pagos and instructor bank data"
```

---

### Task 6: Verificación final (coverage + e2e)

**Files:**
- Modify/Create: tests y e2e si fallan o faltan

**Step 1: Coverage**

Run:

```bash
npm run test:coverage
```

Expected: PASS con umbrales.

**Step 2: E2E**

Run:

```bash
npm run e2e
```

Expected: PASS.

**Step 3: Fix iterativo**

Si falla coverage o E2E: agregar tests o ajustar implementación hasta verde.

