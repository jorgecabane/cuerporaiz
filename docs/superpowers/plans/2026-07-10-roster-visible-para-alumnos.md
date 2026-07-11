# Roster visible para alumnos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alumnos ven, antes y después de reservar una clase, quiénes más tienen cupo confirmado (nombre completo + avatar, sin email), controlado por un check opt-in en Configuración del centro.

**Architecture:** Endpoint dedicado `GET /api/reservations/roster` + caso de uso `listClassRosterUseCase` (solo `CONFIRMED`, sin email) + componente de solo lectura `ClassRosterAccordion` reutilizado en las dos superficies donde el alumno ve clases: `ClassCard` (calendario de `/panel`) y `ReservationsList` (`/panel/reservas`). Precarga por día/lote (mismo patrón que ya usa el staff para asistencia), no por click individual.

**Tech Stack:** Next.js App Router, Prisma 7 (Postgres), Zod, Vitest, Playwright.

## Global Constraints

- UI copy en español chileno con tú, masculino genérico (ver checklist de CLAUDE.md). Nunca voseo argentino.
- Cualquier `toLocaleDateString`/`toLocaleTimeString` nuevo debe llevar `timeZone` explícito — **no aplica en esta feature** (el roster no muestra fechas/horas, solo nombre+avatar).
- Roles: nunca comparar con string literal — usar helpers de `@/lib/domain/role` (`isAdminRole`, `isStudentRole`, `isInstructorRole`).
- Pre-commit hook corre lint-staged → typecheck → test → e2e. Nunca usar `--no-verify`.
- Cobertura Vitest: 90% líneas/funciones/branches/statements, pero **solo sobre los globs en `vitest.config.ts` `coverage.include`** (`lib/domain/**`, `lib/dto/**`, `lib/email/**`, y una lista específica de `lib/application/*.ts`). `lib/application/class-roster.ts` NO está en esa lista — el unit test de la Tarea 2 es buena práctica y protege contra regresiones, pero no mueve el gate global. No agregar el archivo a `coverage.include` (fuera de alcance, afectaría el gate de todo el repo).
- Stop `npm run dev` antes de correr el hook de pre-commit (lock de `.next/dev/lock`).
- Tests E2E de student solo corren con `E2E_ENABLE_STUDENT=1` (ver `playwright.config.ts`); el archivo debe tener `student` en el nombre para enrutarse al proyecto `chromium-student`.

---

## Task 1: Campo de policy `Center.showClassRosterToStudents`

**Files:**
- Modify: `prisma/schema.prisma:28` (modelo `Center`)
- Create: `prisma/migrations/<timestamp>_add_show_class_roster_to_students/migration.sql` (generado por Prisma)
- Modify: `lib/domain/center.ts:21`
- Modify: `lib/ports/center-repository.ts:9`
- Modify: `lib/adapters/db/center-repository.ts` (tipo de `toDomainCenter`, cuerpo de `toDomainCenter`, `updatePolicies`)

**Interfaces:**
- Produces: `Center.showClassRosterToStudents: boolean` (dominio), `CenterPoliciesUpdate.showClassRosterToStudents?: boolean` (puerto) — usados por Tarea 2 (use case), Tarea 4 (checkbox admin).

- [ ] **Step 1: Agregar el campo al schema Prisma**

En `prisma/schema.prisma`, en el modelo `Center`, justo después de la línea `allowTrialClassPerPerson Boolean @default(true) // una clase de prueba por persona`:

```prisma
  showClassRosterToStudents      Boolean  @default(false) // alumno ve quién más tiene cupo confirmado en la misma clase
```

- [ ] **Step 2: Generar y aplicar la migración**

Run: `npx prisma migrate dev --name add_show_class_roster_to_students`
Expected: crea `prisma/migrations/<timestamp>_add_show_class_roster_to_students/migration.sql` con `ALTER TABLE "Center" ADD COLUMN "showClassRosterToStudents" BOOLEAN NOT NULL DEFAULT false;` y regenera el cliente Prisma sin errores.

- [ ] **Step 3: Agregar el campo al dominio**

En `lib/domain/center.ts`, agregar después de la línea `allowTrialClassPerPerson: boolean;`:

```ts
  /** Alumno ve quién más tiene cupo confirmado en la misma clase (opt-in, default false) */
  showClassRosterToStudents: boolean;
```

- [ ] **Step 4: Agregar el campo al puerto**

En `lib/ports/center-repository.ts`, agregar a `CenterPoliciesUpdate` después de `allowTrialClassPerPerson?: boolean;`:

```ts
  showClassRosterToStudents?: boolean;
```

- [ ] **Step 5: Agregar el campo al adapter**

En `lib/adapters/db/center-repository.ts`:

En el tipo de parámetro de `toDomainCenter`, agregar después de `allowTrialClassPerPerson: boolean;`:

```ts
  showClassRosterToStudents: boolean;
```

En el cuerpo de `toDomainCenter` (el objeto que retorna), agregar después de `allowTrialClassPerPerson: c.allowTrialClassPerPerson,`:

```ts
    showClassRosterToStudents: c.showClassRosterToStudents,
```

En `updatePolicies`, agregar después de la línea `if (data.allowTrialClassPerPerson !== undefined) payload.allowTrialClassPerPerson = data.allowTrialClassPerPerson;`:

```ts
    if (data.showClassRosterToStudents !== undefined) payload.showClassRosterToStudents = data.showClassRosterToStudents;
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (0 exit code).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/domain/center.ts lib/ports/center-repository.ts lib/adapters/db/center-repository.ts
git commit -m "feat(centro): agrega policy showClassRosterToStudents"
```

---

## Task 2: DTO + caso de uso `listClassRosterUseCase` (TDD)

**Files:**
- Create: `lib/dto/class-roster-dto.ts`
- Create: `lib/application/class-roster.ts`
- Create: `lib/application/class-roster.test.ts`

**Interfaces:**
- Consumes: `centerRepository.findById(id): Promise<Center | null>`, `liveClassRepository.findById(id): Promise<LiveClass | null>`, `prisma.reservation.findMany(...)` — todos desde `@/lib/adapters/db` (Tarea 1 ya agregó `showClassRosterToStudents` a `Center`).
- Produces: `ClassRosterEntryDto { userId: string; name: string | null; lastName: string | null; imageUrl: string | null }` (en `lib/dto/class-roster-dto.ts`, usado por Tarea 3 y por el frontend en Tareas 5-8). `listClassRosterUseCase(liveClassId: string, centerId: string): Promise<ListClassRosterResult>` donde `ListClassRosterResult = { success: true; roster: ClassRosterEntryDto[] } | { success: false; code: "ROSTER_DISABLED" | "NOT_FOUND"; message: string }` (usado por Tarea 3).

- [ ] **Step 1: Crear el DTO**

Crear `lib/dto/class-roster-dto.ts`:

```ts
/**
 * DTOs para el roster de compañeros registrados en una clase (vista alumno).
 * Sin email — a diferencia de ClassAttendanceDto (staff).
 */
import { z } from "zod";

export const classRosterQuerySchema = z.object({
  liveClassId: z.string().min(1, "liveClassId requerido"),
});

export type ClassRosterQuery = z.infer<typeof classRosterQuerySchema>;

export interface ClassRosterEntryDto {
  userId: string;
  name: string | null;
  lastName: string | null;
  imageUrl: string | null;
}
```

- [ ] **Step 2: Escribir los tests (fallando)**

Crear `lib/application/class-roster.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listClassRosterUseCase } from "./class-roster";
import type { Center, LiveClass } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  centerRepository: { findById: vi.fn() },
  liveClassRepository: { findById: vi.fn() },
  prisma: { reservation: { findMany: vi.fn() } },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  prisma: mocks.prisma,
}));

function makeCenter(overrides: Partial<Center> = {}): Center {
  return {
    id: "center-1",
    name: "Centro Test",
    slug: "centro-test",
    currency: "CLP",
    timezone: "America/Santiago",
    cancelBeforeMinutes: 720,
    maxNoShowsPerMonth: 2,
    bookBeforeMinutes: 1440,
    notifyWhenSlotFreed: true,
    instructorCanReserveForStudent: true,
    allowTrialClassPerPerson: true,
    calendarStartHour: 7,
    calendarEndHour: 22,
    calendarWeekStartDay: 1,
    defaultClassDurationMinutes: 60,
    bankTransferEnabled: false,
    bankName: null,
    bankAccountType: null,
    bankAccountNumber: null,
    bankAccountHolder: null,
    bankAccountRut: null,
    bankAccountEmail: null,
    bankTransferAcceptPlans: true,
    bankTransferAcceptEvents: false,
    bankTransferRequireReceipt: true,
    welcomeEmailCustomBody: "",
    showClassRosterToStudents: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLiveClass(overrides: Partial<LiveClass> = {}): LiveClass {
  return {
    id: "lc-1",
    centerId: "center-1",
    title: "Yoga",
    startsAt: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 60,
    maxCapacity: 10,
    disciplineId: null,
    instructorId: null,
    isOnline: false,
    meetingUrl: null,
    acceptsTrialReservations: false,
    trialCapacity: null,
    color: null,
    classPassEnabled: false,
    classPassCapacity: null,
    seriesId: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("listClassRosterUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.centerRepository.findById.mockResolvedValue(makeCenter());
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());
    mocks.prisma.reservation.findMany.mockResolvedValue([]);
  });

  it("devuelve ROSTER_DISABLED si el centro no habilitó la policy", async () => {
    mocks.centerRepository.findById.mockResolvedValue(
      makeCenter({ showClassRosterToStudents: false })
    );
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({
      success: false,
      code: "ROSTER_DISABLED",
      message: "El centro no habilitó ver quién más está registrado",
    });
    expect(mocks.liveClassRepository.findById).not.toHaveBeenCalled();
  });

  it("devuelve NOT_FOUND si la clase no existe", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(null);
    const result = await listClassRosterUseCase("lc-missing", "center-1");
    expect(result).toEqual({ success: false, code: "NOT_FOUND", message: "Clase no encontrada" });
  });

  it("devuelve NOT_FOUND si la clase pertenece a otro centro", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ centerId: "center-2" }));
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({ success: false, code: "NOT_FOUND", message: "Clase no encontrada" });
  });

  it("devuelve solo reservas CONFIRMED, mapeadas sin email", async () => {
    mocks.prisma.reservation.findMany.mockResolvedValue([
      {
        id: "res-1",
        status: "CONFIRMED",
        user: { id: "user-1", name: "María", lastName: "González", imageUrl: "https://cdn/x.jpg" },
      },
    ]);
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({
      success: true,
      roster: [{ userId: "user-1", name: "María", lastName: "González", imageUrl: "https://cdn/x.jpg" }],
    });
    expect(mocks.prisma.reservation.findMany).toHaveBeenCalledWith({
      where: { liveClassId: "lc-1", status: "CONFIRMED" },
      include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("no incluye email en las entradas del roster", async () => {
    mocks.prisma.reservation.findMany.mockResolvedValue([
      { id: "res-1", status: "CONFIRMED", user: { id: "user-1", name: "María", lastName: null, imageUrl: null } },
    ]);
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result.success && result.roster[0]).not.toHaveProperty("email");
  });
});
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `npx vitest run lib/application/class-roster.test.ts`
Expected: FAIL — `Cannot find module './class-roster'` (el archivo todavía no existe).

- [ ] **Step 4: Implementar el caso de uso**

Crear `lib/application/class-roster.ts`:

```ts
/**
 * Caso de uso: listar compañeros con reserva confirmada en una clase, para
 * que un alumno decida si reservar. Requiere que el centro tenga habilitado
 * showClassRosterToStudents. Sin email — a diferencia de ClassAttendanceDto.
 */
import { centerRepository, liveClassRepository, prisma } from "@/lib/adapters/db";
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";

export type ListClassRosterResult =
  | { success: true; roster: ClassRosterEntryDto[] }
  | { success: false; code: "ROSTER_DISABLED" | "NOT_FOUND"; message: string };

export async function listClassRosterUseCase(
  liveClassId: string,
  centerId: string
): Promise<ListClassRosterResult> {
  const center = await centerRepository.findById(centerId);
  if (!center?.showClassRosterToStudents) {
    return {
      success: false,
      code: "ROSTER_DISABLED",
      message: "El centro no habilitó ver quién más está registrado",
    };
  }

  const liveClass = await liveClassRepository.findById(liveClassId);
  if (!liveClass || liveClass.centerId !== centerId) {
    return { success: false, code: "NOT_FOUND", message: "Clase no encontrada" };
  }

  const reservations = await prisma.reservation.findMany({
    where: { liveClassId, status: "CONFIRMED" },
    include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  const roster: ClassRosterEntryDto[] = reservations.map((r) => ({
    userId: r.user.id,
    name: r.user.name,
    lastName: r.user.lastName,
    imageUrl: r.user.imageUrl,
  }));

  return { success: true, roster };
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npx vitest run lib/application/class-roster.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/dto/class-roster-dto.ts lib/application/class-roster.ts lib/application/class-roster.test.ts
git commit -m "feat(reservas): agrega listClassRosterUseCase con tests"
```

---

## Task 3: Endpoint `GET /api/reservations/roster`

**Files:**
- Create: `app/api/reservations/roster/route.ts`

**Interfaces:**
- Consumes: `listClassRosterUseCase` y `ListClassRosterResult` de `@/lib/application/class-roster` (Tarea 2), `classRosterQuerySchema` de `@/lib/dto/class-roster-dto` (Tarea 2), `auth` de `@/auth`.
- Produces: `GET /api/reservations/roster?liveClassId=` — 200 con `ClassRosterEntryDto[]` en el body; 401 sin sesión; 400 si falta `liveClassId`; 403 si `ROSTER_DISABLED`; 404 si `NOT_FOUND`. Consumido por el frontend en Tareas 7 y 8.

- [ ] **Step 1: Implementar el endpoint**

Crear `app/api/reservations/roster/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listClassRosterUseCase } from "@/lib/application/class-roster";
import { classRosterQuerySchema } from "@/lib/dto/class-roster-dto";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = classRosterQuerySchema.safeParse({
    liveClassId: searchParams.get("liveClassId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "liveClassId requerido" },
      { status: 400 }
    );
  }

  const result = await listClassRosterUseCase(parsed.data.liveClassId, session.user.centerId);
  if (!result.success) {
    const status = result.code === "ROSTER_DISABLED" ? 403 : 404;
    return NextResponse.json({ code: result.code, message: result.message }, { status });
  }

  return NextResponse.json(result.roster);
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Verificación manual del endpoint**

Con el server corriendo (`npm run dev`), habilitar la policy manualmente en la DB para un centro de prueba:

```bash
npx prisma studio
```

En la tabla `Center`, poner `showClassRosterToStudents = true` para tu centro local. Luego, logueado como alumno en el navegador, abrir en una pestaña `/api/reservations/roster?liveClassId=<id-de-una-clase-real>` y confirmar que devuelve `[]` o una lista de objetos `{userId, name, lastName, imageUrl}` sin `email`.

- [ ] **Step 4: Commit**

```bash
git add app/api/reservations/roster/route.ts
git commit -m "feat(reservas): agrega endpoint GET /api/reservations/roster"
```

---

## Task 4: Checkbox de configuración del centro

**Files:**
- Modify: `app/panel/configuracion/actions.ts`
- Modify: `app/panel/configuracion/PoliticasForm.tsx`

**Interfaces:**
- Consumes: `CenterPoliciesUpdate.showClassRosterToStudents` (Tarea 1), `center.showClassRosterToStudents: boolean` (prop ya recibida por `PoliticasForm`, viene de `Center`).

- [ ] **Step 1: Leer y pasar el campo en la Server Action**

En `app/panel/configuracion/actions.ts`, `updateCenterPolicies` ya recibe `data: CenterPoliciesUpdate` y lo pasa completo a `centerRepository.updatePolicies(centerId, data)` (línea 45) — no requiere cambios en `actions.ts` porque el campo ya viaja dentro de `data` una vez que `PoliticasForm.tsx` lo incluya en el objeto que arma. **No hay cambios en este archivo.**

- [ ] **Step 2: Agregar el checkbox al formulario**

En `app/panel/configuracion/PoliticasForm.tsx`, dentro del `<form action={...}>`, agregar la lectura del campo junto a las otras (después de la línea `const allowTrialClassPerPerson = formData.get("allowTrialClassPerPerson") === "on";`):

```tsx
        const showClassRosterToStudents = formData.get("showClassRosterToStudents") === "on";
```

Y agregarlo al objeto pasado a `updateCenterPolicies` (después de `allowTrialClassPerPerson,`):

```tsx
            allowTrialClassPerPerson,
            showClassRosterToStudents,
```

Luego, en el JSX, agregar un nuevo bloque de checkbox después del bloque de `allowTrialClassPerPerson` (después del `</div>` que cierra ese checkbox, línea 120, dentro del mismo `<div className="grid gap-4 sm:grid-cols-1">`):

```tsx
        <div className="flex items-center gap-2">
          <input
            id="showClassRosterToStudents"
            name="showClassRosterToStudents"
            type="checkbox"
            defaultChecked={center.showClassRosterToStudents}
            className="rounded border-[var(--color-border)]"
          />
          <label htmlFor="showClassRosterToStudents" className="text-sm text-[var(--color-text)]">
            Mostrar a los alumnos quién más está registrado en la clase
          </label>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] -mt-2">
          Los alumnos verán el nombre y la foto de perfil de quienes ya tienen un cupo confirmado en la misma clase.
        </p>
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Con `npm run dev` corriendo, loguearse como admin, ir a `/panel/configuracion`, tildar el nuevo check, guardar, recargar la página y confirmar que sigue tildado (persiste en DB).

- [ ] **Step 5: Commit**

```bash
git add app/panel/configuracion/PoliticasForm.tsx
git commit -m "feat(configuracion): agrega check para mostrar roster a alumnos"
```

---

## Task 5: Componente `ClassRosterAccordion`

**Files:**
- Create: `components/panel/reservas/ClassRosterAccordion.tsx`
- Modify: `components/panel/reservas/index.ts`

**Interfaces:**
- Consumes: `ClassRosterEntryDto` de `@/lib/dto/class-roster-dto` (Tarea 2).
- Produces: `ClassRosterAccordion({ roster: ClassRosterEntryDto[] })` — componente reutilizado por Tarea 6 (`ClassCard`) y Tarea 8 (`ReservationsList`).

- [ ] **Step 1: Crear el componente**

Crear `components/panel/reservas/ClassRosterAccordion.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";

function rosterInitials(name: string | null, lastName: string | null): string {
  const first = name?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function rosterFullName(name: string | null, lastName: string | null): string {
  return [name, lastName].filter(Boolean).join(" ").trim() || "Alumno";
}

export interface ClassRosterAccordionProps {
  /** Compañeros con reserva confirmada en la clase (ya cargados por el padre). */
  roster: ClassRosterEntryDto[];
}

export function ClassRosterAccordion({ roster }: ClassRosterAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-border)]/30 cursor-pointer"
      >
        <span>Compañeros registrados ({roster.length})</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
      {expanded && (
        <div className="mt-2">
          {roster.length > 0 ? (
            <ul className="space-y-2">
              {roster.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 text-sm">
                  {r.imageUrl ? (
                    <Image
                      src={r.imageUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                      width={28}
                      height={28}
                      unoptimized
                    />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)]"
                      aria-hidden
                    >
                      {rosterInitials(r.name, r.lastName)}
                    </span>
                  )}
                  <span className="text-[var(--color-text)]">{rosterFullName(r.name, r.lastName)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Aún no hay nadie más registrado en esta clase.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Exportar desde el barrel**

En `components/panel/reservas/index.ts`, agregar después de `export type { ClassCardProps } from "./ClassCard";`:

```ts
export { ClassRosterAccordion } from "./ClassRosterAccordion";
export type { ClassRosterAccordionProps } from "./ClassRosterAccordion";
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/panel/reservas/ClassRosterAccordion.tsx components/panel/reservas/index.ts
git commit -m "feat(reservas): agrega ClassRosterAccordion (solo lectura)"
```

---

## Task 6: Wiring en `ClassCard`

**Files:**
- Modify: `components/panel/reservas/ClassCard.tsx`

**Interfaces:**
- Consumes: `ClassRosterAccordion` (Tarea 5), `ClassRosterEntryDto` (Tarea 2).
- Produces: `ClassCardProps.showRoster?: boolean`, `ClassCardProps.roster?: ClassRosterEntryDto[]` — consumidos por Tarea 7 (`PanelHomeCalendar`).

- [ ] **Step 1: Importar el componente y el tipo**

En `components/panel/reservas/ClassCard.tsx`, agregar después de la línea `import type { LiveClassDto } from "@/lib/dto/reservation-dto";`:

```tsx
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";
import { ClassRosterAccordion } from "./ClassRosterAccordion";
```

- [ ] **Step 2: Agregar las props**

En la interface `ClassCardProps`, agregar al final (antes del cierre `}`):

```ts
  /** Solo alumno: mostrar acordeón de compañeros registrados (según policy del centro) */
  showRoster?: boolean;
  /** Solo alumno: compañeros con reserva confirmada en esta clase */
  roster?: ClassRosterEntryDto[];
```

En la desestructuración de props de `ClassCard(...)`, agregar al final (antes de `}: ClassCardProps) {`):

```tsx
  showRoster = false,
  roster,
```

- [ ] **Step 3: Renderizar el acordeón para la variante alumno**

Justo después del bloque `{isStaff && ( ... )}` que cierra en la línea 338 (`)}`) y antes del `</div>` que cierra `min-w-0 flex-1` (línea 339), agregar:

```tsx
          {!isStaff && showRoster && <ClassRosterAccordion roster={roster ?? []} />}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add components/panel/reservas/ClassCard.tsx
git commit -m "feat(reservas): ClassCard renderiza roster de solo lectura para alumnos"
```

---

## Task 7: Wiring en calendario home (`PanelHomeCalendar` + `app/panel/page.tsx`)

**Files:**
- Modify: `app/panel/PanelHomeCalendar.tsx`
- Modify: `app/panel/page.tsx`

**Interfaces:**
- Consumes: `ClassCard` con `showRoster`/`roster` (Tarea 6), endpoint `GET /api/reservations/roster` (Tarea 3).
- Produces: nada consumido por otras tareas (surface terminal).

- [ ] **Step 1: Agregar la prop al componente**

En `app/panel/PanelHomeCalendar.tsx`, en `PanelHomeCalendarProps` (línea 32-36), agregar:

```ts
  showClassRosterToStudents: boolean;
```

En la desestructuración de `PanelHomeCalendar({...})` (línea 38-42), agregar:

```ts
  showClassRosterToStudents,
```

- [ ] **Step 2: Importar el tipo del DTO**

Agregar después de `import type { WaitlistEntryDto } from "@/lib/dto/waitlist-dto";`:

```ts
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";
```

- [ ] **Step 3: Agregar estado y función de carga**

Después de la declaración `const [staffAttendeesByClass, setStaffAttendeesByClass] = useState<Record<string, ClassAttendanceDto[]>>({});` (línea 45), agregar:

```ts
  const [rosterByClassId, setRosterByClassId] = useState<Record<string, ClassRosterEntryDto[]>>({});
```

Después de la función `loadStaffAttendeesForDay` (cierra en la línea 155), agregar una función análoga:

```ts
  const loadRosterForDay = useCallback(
    async (dayKey: string) => {
      const byDay = groupClassesByDay(liveClasses);
      const classesOfDay = byDay.get(dayKey) ?? [];
      if (classesOfDay.length === 0) return;
      const results = await Promise.all(
        classesOfDay.map(async (c) => {
          const res = await fetch(`/api/reservations/roster?liveClassId=${encodeURIComponent(c.id)}`);
          const raw = res.ok ? await res.json() : [];
          const roster: ClassRosterEntryDto[] = Array.isArray(raw) ? raw : [];
          return { id: c.id, roster } as const;
        })
      );
      setRosterByClassId((prev) => {
        const next = { ...prev };
        for (const { id, roster } of results) next[id] = roster;
        return next;
      });
    },
    [liveClasses]
  );
```

- [ ] **Step 4: Disparar la carga cuando cambia el día seleccionado (solo alumno + policy activa)**

Después del `useEffect` que llama a `loadStaffAttendeesForDay` (líneas 252-256), agregar:

```ts
  useEffect(() => {
    if (isStudentRole(role) && showClassRosterToStudents && effectiveSelectedDay && liveClasses.length > 0) {
      loadRosterForDay(effectiveSelectedDay);
    }
  }, [role, showClassRosterToStudents, effectiveSelectedDay, liveClasses.length, loadRosterForDay]);
```

- [ ] **Step 5: Pasar los datos a `ClassCard` en el render de alumno**

En el bloque `isStudent ? (...)` (líneas 736-760), dentro del `<ClassCard ... />` (líneas 741-757), agregar después de `leaveWaitlistLoadingId={leaveWaitlistLoadingId}`:

```tsx
                  showRoster={showClassRosterToStudents}
                  roster={rosterByClassId[c.id] ?? []}
```

- [ ] **Step 6: Pasar la prop desde `app/panel/page.tsx`**

En `app/panel/page.tsx`, en el `<PanelHomeCalendar ... />` (líneas 218-222), agregar después de `weekStartDay={center?.calendarWeekStartDay ?? 1}`:

```tsx
          showClassRosterToStudents={center?.showClassRosterToStudents ?? false}
```

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 8: Verificación manual**

Con la policy activada (Task 3, Step 3) y logueado como alumno, ir a `/panel`, confirmar que las clases del calendario muestran el acordeón "Compañeros registrados (N)" y que expandirlo lista nombre+avatar sin mostrar email en la UI ni en Network.

- [ ] **Step 9: Commit**

```bash
git add app/panel/PanelHomeCalendar.tsx app/panel/page.tsx
git commit -m "feat(panel): calendario home carga y muestra roster para alumnos"
```

---

## Task 8: Wiring en `/panel/reservas` (`ReservationsList` + `ReservasPanel` + `app/panel/reservas/page.tsx`)

**Files:**
- Modify: `components/panel/reservas/ReservationsList.tsx`
- Modify: `app/panel/reservas/ReservasPanel.tsx`
- Modify: `app/panel/reservas/page.tsx`

**Interfaces:**
- Consumes: `ClassRosterAccordion` (Tarea 5), `ClassRosterEntryDto` (Tarea 2), endpoint `GET /api/reservations/roster` (Tarea 3).
- Produces: nada consumido por otras tareas (surface terminal).

- [ ] **Step 1: Agregar props a `ReservationsList`**

En `components/panel/reservas/ReservationsList.tsx`, agregar el import después de `import { useTimezone } from "@/components/providers/TimezoneProvider";`:

```tsx
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";
import { ClassRosterAccordion } from "./ClassRosterAccordion";
```

En `ReservationsListProps`, agregar al final:

```ts
  /** Mostrar roster de compañeros (solo para reservas CONFIRMED, según policy del centro) */
  showRoster?: boolean;
  /** Roster ya cargado por el padre, indexado por liveClassId */
  rosterByClassId?: Record<string, ClassRosterEntryDto[]>;
```

En la desestructuración de `ReservationsList({...})`, agregar:

```ts
  showRoster = false,
  rosterByClassId,
```

- [ ] **Step 2: Renderizar el acordeón por reserva confirmada**

Dentro del `<li>` de cada reserva, justo después del `</div>` que cierra `flex flex-wrap items-start justify-between gap-2` (línea 120, antes del cierre del `<li>`), agregar:

```tsx
            {showRoster && r.status === "CONFIRMED" && (
              <ClassRosterAccordion roster={rosterByClassId?.[r.liveClassId] ?? []} />
            )}
```

- [ ] **Step 3: Agregar estado y carga en `ReservasPanel`**

En `app/panel/reservas/ReservasPanel.tsx`, agregar el import después de `import { useTimezone } from "@/components/providers/TimezoneProvider";`:

```tsx
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";
```

Agregar `showClassRosterToStudents: boolean;` a `ReservasPanelProps` y a la desestructuración de `ReservasPanel({...})`.

Después de `const [showTrialCta, setShowTrialCta] = useState(false);`, agregar:

```ts
  const [rosterByClassId, setRosterByClassId] = useState<Record<string, ClassRosterEntryDto[]>>({});

  const loadRoster = useCallback(async (liveClassIds: string[]) => {
    if (liveClassIds.length === 0) return;
    const results = await Promise.all(
      liveClassIds.map(async (id) => {
        const res = await fetch(`/api/reservations/roster?liveClassId=${encodeURIComponent(id)}`);
        const raw = res.ok ? await res.json() : [];
        const roster: ClassRosterEntryDto[] = Array.isArray(raw) ? raw : [];
        return { id, roster } as const;
      })
    );
    setRosterByClassId((prev) => {
      const next = { ...prev };
      for (const { id, roster } of results) next[id] = roster;
      return next;
    });
  }, []);
```

- [ ] **Step 4: Disparar la carga cuando cambian las reservas (solo alumno + policy activa)**

Después del `useEffect` que carga `showTrialCta` (líneas 89-96), agregar:

```ts
  useEffect(() => {
    if (!isStudentRole(role) || !showClassRosterToStudents) return;
    const ids = Array.from(
      new Set(
        [...segmentedReservations.hoy, ...segmentedReservations.proximas]
          .filter((r) => r.status === "CONFIRMED")
          .map((r) => r.liveClassId)
      )
    );
    loadRoster(ids);
  }, [role, showClassRosterToStudents, segmentedReservations, loadRoster]);
```

- [ ] **Step 5: Pasar las props a `ReservationsList` (solo tabs Hoy y Próximas)**

En el `<TabsContent value={TAB_HOY}>` (líneas 312-321), agregar a `<ReservationsList ... />` después de `emptyMessage="No tienes reservas para hoy."`:

```tsx
              showRoster={showClassRosterToStudents}
              rosterByClassId={rosterByClassId}
```

En el `<TabsContent value={TAB_PROXIMAS}>` (líneas 322-331), agregar lo mismo después de `emptyMessage="No tienes próximas reservas."`. **No** agregar estas props en los tabs `TAB_CANCELADAS` ni `TAB_HISTORICAS`.

- [ ] **Step 6: Pasar la prop desde `app/panel/reservas/page.tsx`**

En `app/panel/reservas/page.tsx`, agregar después de `const weekStartDay = center?.calendarWeekStartDay ?? 1;`:

```ts
  const showClassRosterToStudents = center?.showClassRosterToStudents ?? false;
```

Y en el `<ReservasPanel ... />`, agregar después de `weekStartDay={weekStartDay}`:

```tsx
      showClassRosterToStudents={showClassRosterToStudents}
```

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 8: Verificación manual**

Con la policy activada y logueado como alumno con al menos una reserva confirmada futura, ir a `/panel/reservas`, tabs "Hoy" y "Próximas", confirmar que aparece el acordeón en las reservas confirmadas y no en "Canceladas"/"Históricas".

- [ ] **Step 9: Commit**

```bash
git add components/panel/reservas/ReservationsList.tsx app/panel/reservas/ReservasPanel.tsx app/panel/reservas/page.tsx
git commit -m "feat(reservas): /panel/reservas carga y muestra roster para alumnos"
```

---

## Task 9: E2E — helper + spec

**Files:**
- Modify: `e2e/helpers/cleanup.ts`
- Create: `e2e/roster-student.spec.ts`

**Interfaces:**
- Consumes: `seedTier1LiveClass`, `seedTier1StudentWithActivePlan`, `seedTier1Reservation`, `seedForeignCenterFixtures`, `cleanupLiveClasses`, `cleanupTier1Reservations` (ya existen en `e2e/helpers/cleanup.ts`).
- Produces: `setTier2CenterShowRoster(opts: { centerSlug: string; show: boolean }): Promise<{ previous: boolean } | null>` — usado solo por este spec.

- [ ] **Step 1: Agregar el helper de toggle**

En `e2e/helpers/cleanup.ts`, agregar después de la función `setTier2CenterAllowTrial` (línea 1602):

```ts
/**
 * Toggle `showClassRosterToStudents` del centro. Devuelve el valor previo
 * para restaurarlo en afterAll.
 */
export async function setTier2CenterShowRoster(opts: {
  centerSlug: string;
  show: boolean;
}): Promise<{ previous: boolean } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const previous = center.showClassRosterToStudents;
  await prisma.center.update({
    where: { id: center.id },
    data: { showClassRosterToStudents: opts.show },
  });
  return { previous };
}
```

- [ ] **Step 2: Escribir el spec E2E**

Crear `e2e/roster-student.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import {
  seedTier1LiveClass,
  seedTier1StudentWithActivePlan,
  seedTier1Reservation,
  seedForeignCenterFixtures,
  cleanupForeignCenterFixtures,
  cleanupLiveClasses,
  cleanupTier1Reservations,
  setTier2CenterShowRoster,
} from "./helpers/cleanup";

/**
 * E2E — roster de compañeros registrados (vista alumno).
 * Corre en el proyecto `chromium-student` (storageState .auth/student.json,
 * usuario student@e2e.test), solo con E2E_ENABLE_STUDENT=1.
 */

const CENTER_SLUG = "e2e-test";

test.describe("Roster de compañeros — policy activada", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let toggle: Awaited<ReturnType<typeof setTier2CenterShowRoster>>;
  let liveClass: Awaited<ReturnType<typeof seedTier1LiveClass>>;
  let companion: Awaited<ReturnType<typeof seedTier1StudentWithActivePlan>>;
  let companionReservation: Awaited<ReturnType<typeof seedTier1Reservation>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Roster ${runId}`;
    toggle = await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: true });
    liveClass = await seedTier1LiveClass({ centerSlug: CENTER_SLUG, title, daysFromNow: 2 });
    companion = await seedTier1StudentWithActivePlan({
      centerSlug: CENTER_SLUG,
      email: `roster-companion-${runId}@e2e.test`,
    });
    if (liveClass && companion) {
      companionReservation = await seedTier1Reservation({
        userId: companion.userId,
        liveClassId: liveClass.liveClassId,
        userPlanId: companion.userPlanId,
      });
    }
  });

  test.afterAll(async () => {
    if (companionReservation) {
      await cleanupTier1Reservations([companionReservation.reservationId]);
    }
    await cleanupLiveClasses(title);
    if (toggle) {
      await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: toggle.previous });
    }
  });

  test("alumno ve al compañero registrado (nombre+avatar) sin email en la respuesta", async ({ request }) => {
    test.skip(!liveClass || !companionReservation, "Sin DB en este worker");

    const res = await request.get(`/api/reservations/roster?liveClassId=${liveClass!.liveClassId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ userId: companion!.userId, name: "Student Tier1" });
    expect(body[0]).not.toHaveProperty("email");
  });
});

test.describe("Roster de compañeros — policy desactivada", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let toggle: Awaited<ReturnType<typeof setTier2CenterShowRoster>>;
  let liveClass: Awaited<ReturnType<typeof seedTier1LiveClass>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Roster Disabled ${runId}`;
    toggle = await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: false });
    liveClass = await seedTier1LiveClass({ centerSlug: CENTER_SLUG, title, daysFromNow: 2 });
  });

  test.afterAll(async () => {
    await cleanupLiveClasses(title);
    if (toggle) {
      await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: toggle.previous });
    }
  });

  test("endpoint devuelve 403 ROSTER_DISABLED", async ({ request }) => {
    test.skip(!liveClass, "Sin DB en este worker");

    const res = await request.get(`/api/reservations/roster?liveClassId=${liveClass!.liveClassId}`);
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("ROSTER_DISABLED");
  });
});

test.describe("Roster de compañeros — aislamiento multi-tenant", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let toggle: Awaited<ReturnType<typeof setTier2CenterShowRoster>>;
  let foreignFixtures: Awaited<ReturnType<typeof seedForeignCenterFixtures>> = null;
  let foreignLiveClass: Awaited<ReturnType<typeof seedTier1LiveClass>> = null;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Roster Foreign ${runId}`;
    toggle = await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: true });
    foreignFixtures = await seedForeignCenterFixtures();
    if (foreignFixtures) {
      foreignLiveClass = await seedTier1LiveClass({ centerSlug: "e2e-foreign", title, daysFromNow: 2 });
    }
  });

  test.afterAll(async () => {
    await cleanupForeignCenterFixtures();
    await cleanupLiveClasses(title);
    if (toggle) {
      await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: toggle.previous });
    }
  });

  test("alumno de e2e-test no puede leer el roster de una clase de otro centro → 404", async ({ request }) => {
    test.skip(!foreignFixtures || !foreignLiveClass, "Sin DB en este worker");

    const res = await request.get(
      `/api/reservations/roster?liveClassId=${foreignLiveClass!.liveClassId}`
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
  });
});
```

- [ ] **Step 3: Correr el spec**

Run: `E2E_ENABLE_STUDENT=1 npx playwright test e2e/roster-student.spec.ts`
Expected: PASS (3 describe blocks, 3 tests). Si falla por falta de DB (`Sin DB en este worker`), confirmar que `DATABASE_URL` apunta a una base de test antes de reintentar.

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers/cleanup.ts e2e/roster-student.spec.ts
git commit -m "test(e2e): agrega roster-student.spec.ts"
```

---

## Task 10: Verificación final

**Files:** ninguno (solo comandos)

- [ ] **Step 1: Detener el dev server**

Confirmar que no hay `npm run dev` corriendo (bloquea `.next/dev/lock` para el pre-commit hook).

- [ ] **Step 2: Typecheck completo**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 4: Unit tests con coverage**

Run: `npm run test:coverage`
Expected: todos los tests pasan; thresholds globales (90% líneas/funciones/branches/statements) se mantienen — `class-roster.ts` no está en `coverage.include` así que no afecta el número, pero sus propios tests deben pasar.

- [ ] **Step 5: E2E default (sin student)**

Run: `npm run e2e`
Expected: pasa igual que antes de este cambio (los specs `*student*` se ignoran por default).

- [ ] **Step 6: E2E con student habilitado**

Run: `E2E_ENABLE_STUDENT=1 npm run e2e`
Expected: pasa incluyendo `roster-student.spec.ts` y el resto de specs de student existentes.

- [ ] **Step 7: Confirmar que el pre-commit hook completo pasa**

Esto ya se ejecuta automáticamente en el próximo `git commit` (lint-staged → typecheck → test → e2e). Si algo fallara ahí que no falló en los steps anteriores, investigar antes de continuar — no usar `--no-verify`.
