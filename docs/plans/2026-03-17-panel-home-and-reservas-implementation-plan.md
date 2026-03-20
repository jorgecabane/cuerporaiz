# Panel Home + Mis Reservas (Adaptive Sheet) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Relacionado con:** [2026-03-panel-home-refactor-brainstorming.md](2026-03-panel-home-refactor-brainstorming.md) (home mobile-first) · [2026-03-17-panel-reservas-bottom-sheet-cancelaciones-design.md](2026-03-17-panel-reservas-bottom-sheet-cancelaciones-design.md) (diseño sheet + cancelaciones).

**Goal:** Refactor `/panel` a dashboard mobile-first por rol y agregar “Mis reservas” en un sheet reutilizable (móvil bottom-sheet + desktop modal), incluyendo vista de **Canceladas** y soporte de **cancelación tardía** (consume clase).

**Architecture:** Mantener `/panel` como página server, pero mover UI interactiva (sheet + tabs) a componentes client. En backend, extender el modelo de reserva para distinguir `CANCELLED` vs `LATE_CANCELLED` y bloquear cancelaciones después del inicio; exponer información suficiente para segmentar (hoy / próximas / canceladas / históricas) sin duplicar reglas en frontend.

**Tech Stack:** Next.js App Router (`app/`), React 19, Prisma, Vitest, Playwright, Tailwind v4, `framer-motion` (animaciones), componentes UI existentes en `components/ui/*`.

---

## Task 1: Alinear estados de reserva con “late cancel”

**Files:**
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/prisma/schema.prisma`
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/lib/domain/reservation.ts`
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/lib/application/reserve-class.ts`
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/lib/dto/reservation-dto.ts`
- Test: `/Users/cabane/Documents/dev/personal/cuerporaiz/lib/application/reserve-class.test.ts` (crear si no existe) o el archivo de tests existente para estos casos de uso

**Step 1: Write failing unit tests**

- Caso A (a tiempo): al cancelar con `hoursBeforeClass >= center.cancelBeforeHours`:
  - status final = `CANCELLED`
  - si plan con límite: decrementa `classesUsed` (devuelve clase)
- Caso B (tarde): al cancelar con `0 <= hoursBeforeClass < center.cancelBeforeHours`:
  - status final = `LATE_CANCELLED`
  - **no** decrementa `classesUsed`
- Caso C (ya inició): si `liveClass.startsAt <= now`:
  - responde `success:false` con code tipo `CLASS_STARTED` (o similar)

**Step 2: Run tests to verify fail**

Run: `npm test`
Expected: FAIL (no existe `LATE_CANCELLED` / no se bloquea cancelación / assertions no pasan)

**Step 3: Update Prisma enum + dominio**

- Agregar `LATE_CANCELLED` a `enum ReservationStatus` en Prisma.
- Agregar `LATE_CANCELLED` a `ReservationStatus` del dominio.
- Ajustar DTO si tiene typing restringido a los estados actuales.

**Step 4: Implement cancelación tardía + bloqueo post-inicio**

En `cancelReservationUseCase` y `cancelReservationByStaffUseCase`:

- Calcular `hoursBeforeClass`.
- Si `hoursBeforeClass < 0`: retornar error (no cancelar).
- Si `hoursBeforeClass >= cancelBeforeHours`: set status `CANCELLED` y devolver clase al plan (comportamiento actual).
- Si `0 <= hoursBeforeClass < cancelBeforeHours`: set status `LATE_CANCELLED` y **no** devolver clase.

**Step 5: Run Prisma generate / migrate (según workflow del repo)**

- Si usan migraciones: `npx prisma migrate dev -n add_late_cancelled_status`
- Si no: al menos `npx prisma generate`

**Step 6: Re-run unit tests**

Run: `npm test`
Expected: PASS

**Step 7: Commit**

```bash
git add prisma/schema.prisma lib/domain/reservation.ts lib/application/reserve-class.ts lib/dto/reservation-dto.ts
git commit -m "feat: add late cancellation status"
```

---

## Task 2: API — devolver reservas incluyendo canceladas (si hoy no llegan)

**Files:**
- Inspect/Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/app/api/reservations/route.ts`
- Inspect/Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/lib/application/reserve-class.ts` (listMyReservationsPaginated / repository filters)
- Test: archivo de tests de API si existe; si no, test unitario del use case + smoke manual

**Step 1: Ver comportamiento actual**

- Confirmar si `GET /api/reservations` retorna solo `CONFIRMED` o todos.

**Step 2: Ajustar para soportar segmentación completa**

Recomendación:
- `GET /api/reservations` debe devolver **todas** las reservas del usuario (incluyendo `CANCELLED` y `LATE_CANCELLED`) para que el UI pueda armar tabs sin endpoints extra.
- Alternativa: soportar `?status=` o `?statuses=...` y que el sheet pida lo que necesita.

**Step 3: Verificar**

- Smoke manual: abrir `/panel/reservas` y confirmar que sigue mostrando futuras/pasadas y que canceladas aparecen si corresponde.

**Step 4: Commit**

```bash
git add app/api/reservations/route.ts lib/application/reserve-class.ts
git commit -m "feat: include cancelled reservations in api"
```

---

## Task 3: UI base — `AdaptiveSheet` reutilizable (móvil sheet + desktop dialog)

**Files:**
- Create: `/Users/cabane/Documents/dev/personal/cuerporaiz/components/ui/AdaptiveSheet.tsx`
- Create: `/Users/cabane/Documents/dev/personal/cuerporaiz/components/ui/useMediaQuery.ts` (si no existe algo similar)
- (Opcional) Create: `/Users/cabane/Documents/dev/personal/cuerporaiz/components/ui/FocusTrap.tsx` (solo si el repo no tiene utilidades)
- Test: `/Users/cabane/Documents/dev/personal/cuerporaiz/components/ui/AdaptiveSheet.test.tsx` (si el setup de Vitest+jsdom ya testea componentes)

**Step 1: Write failing component test (si aplica)**

- Render con `open=true`:
  - Existe backdrop
  - Click en backdrop llama `onOpenChange(false)` si `dismissible`
  - `Esc` llama `onOpenChange(false)`

**Step 2: Implement minimal `AdaptiveSheet`**

Requerimientos:
- `variant="auto"`: mobile → bottom sheet (85vh), desktop → modal centrado
- `dismissible`, `showDragHandle`
- Animaciones con `framer-motion` respetando `prefers-reduced-motion`
- `role="dialog"`, `aria-modal="true"`, title accesible
- Bloquear scroll del body cuando está abierto

**Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add components/ui/AdaptiveSheet.tsx components/ui/useMediaQuery.ts
git commit -m "feat: add reusable adaptive sheet component"
```

---

## Task 4: “Mis reservas” (tabs) dentro del sheet

**Files:**
- Create: `/Users/cabane/Documents/dev/personal/cuerporaiz/components/panel/reservas/MisReservasSheet.tsx`
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/app/panel/page.tsx`
- (Likely reuse) `/Users/cabane/Documents/dev/personal/cuerporaiz/components/panel/reservas/ReservationsList.tsx` (ajustar para mostrar canceladas + badge)

**Step 1: Implement segmentación**

En `MisReservasSheet`:
- Fetch `GET /api/reservations?page=1&pageSize=50`
- Segmentar:
  - Hoy: `CONFIRMED` con `startsAt` “hoy” y `startsAt > now`
  - Próximas: `CONFIRMED` con `startsAt > now` (y fuera de hoy)
  - Canceladas: `CANCELLED` + `LATE_CANCELLED`
  - Históricas: `ATTENDED` + `NO_SHOW` (y/o `CONFIRMED` en pasado si existiera)

**Step 2: Cancelación desde el sheet**

- Botón Cancelar en Hoy/Próximas:
  - Abre confirm modal (a tiempo vs tardía) usando `center.cancelBeforeHours` (se puede pasar desde server o pedir por API si ya existe endpoint).
  - Llama `PATCH /api/reservations/[id]/cancel`
  - Toast con copy distinto según respuesta (necesita que API devuelva status final `CANCELLED` vs `LATE_CANCELLED`)

**Step 3: Integrar en `/panel`**

- En `/panel/page.tsx`:
  - Reemplazar “Tu perfil” (según plan brainstorming) por bloques compactos:
    - CTA “Reservar clase”
    - Botón/link “Mis reservas” (abre sheet)
    - Resumen breve (puede quedarse placeholder inicialmente si no hay endpoint de resumen)
  - Mantener “Acciones rápidas” con cap de ítems.

**Step 4: Verify**

Run: `npm run lint && npm run typecheck`
Smoke manual:
- `npm run dev` → `/panel` como STUDENT: abre sheet; tabs; cancelación funciona; cierra tap afuera (móvil).

**Step 5: Commit**

```bash
git add app/panel/page.tsx components/panel/reservas/MisReservasSheet.tsx components/panel/reservas/ReservationsList.tsx
git commit -m "feat: add mis reservas sheet to panel home"
```

---

## Task 5: Mejorar `/panel/reservas` para incluir “Canceladas” (coherencia con sheet)

**Files:**
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/app/panel/reservas/ReservasPanel.tsx`
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/components/panel/reservas/*` (tabs/list)

**Step 1: Ajustar tabs**

En la sección “Mis reservas” del panel reservas:
- Cambiar sub-tabs “Futuras/Pasadas” por:
  - Hoy / Próximas / Canceladas / Históricas
(o mantener Futuras/Pasadas y sumar Canceladas como tercer tab; priorizar consistencia con sheet)

**Step 2: Badges**

- En Canceladas: badge “A tiempo” (`CANCELLED`) vs “Tarde” (`LATE_CANCELLED`)

**Step 3: Verify**

Smoke manual en `/panel/reservas`:
- Cancelar una reserva y verla en Canceladas

**Step 4: Commit**

```bash
git add app/panel/reservas/ReservasPanel.tsx components/panel/reservas
git commit -m "feat: add cancelled reservations tab"
```

---

## Task 6: E2E smoke (opcional pero recomendado)

**Files:**
- Create/Modify: `e2e/*` (según estructura actual)

**Step 1: Escribir test mínimo**

- Login como STUDENT
- Ir a `/panel`
- Abrir “Mis reservas”
- Cambiar tab a “Canceladas” (ver vacío o item)

**Step 2: Run**

Run: `npm run e2e`

---

## Task 7: Documentación

**Files:**
- Modify: `/Users/cabane/Documents/dev/personal/cuerporaiz/docs/plans/2026-03-panel-home-refactor-brainstorming.md` (agregar link a este plan y al design doc)
- Already exists: `/Users/cabane/Documents/dev/personal/cuerporaiz/docs/plans/2026-03-17-panel-reservas-bottom-sheet-cancelaciones-design.md`

**Step 1: Añadir referencias cruzadas**

- En el plan de home, agregar un “Relacionado con” y link al design doc.

**Step 2: Commit**

```bash
git add docs/plans/2026-03-panel-home-refactor-brainstorming.md docs/plans/2026-03-17-panel-reservas-bottom-sheet-cancelaciones-design.md docs/plans/2026-03-17-panel-home-and-reservas-implementation-plan.md
git commit -m "docs: add panel home and reservas implementation plan"
```

