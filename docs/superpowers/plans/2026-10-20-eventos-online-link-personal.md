# Eventos online con link personal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eventos marcados como online entregan un link personal por cupo (`/eventos/entrar/[token]`) que muestra sala de espera y redirige a Zoom/Meet a la hora.

**Architecture:** Nueva tabla `EventAttendee` (un registro por cupo, con token). La decisión "¿qué ve este link ahora?" es una función pura de dominio. Los cupos se crean en el checkout (con datos opcionales) y se completan en `notifyEventTicketConfirmation`, punto común de todo ticket que pasa a PAID. El recordatorio se cuelga del cron `class-reminder` existente.

**Tech Stack:** Next.js 16 App Router (params como Promise), Prisma 7 / Postgres (Supabase), Zod, Vitest, Playwright, Resend (vía `sendEmailSafe`).

**Spec:** `docs/superpowers/specs/2026-10-20-eventos-online-link-personal-design.md`

## Global Constraints

- Hexagonal: `lib/domain` sin dependencias de infraestructura; acceso a DB vía `lib/ports` + `lib/adapters/db` (las páginas admin ya usan `prisma` directo para listados; se permite igual que hoy).
- UI copy en español chileno con tú, masculino genérico, sin voseo.
- Roles sólo con helpers de `@/lib/domain/role` (`isAdminRole`), nunca literales.
- Todo display de fecha pasa `timeZone` explícito desde `getCenterTimezone` / `getPublicCenterTimezone` / `useTimezone` / `branding.timezone`.
- Colores, espacios y radios con tokens CSS (`var(--color-…)`, `var(--space-…)`, `var(--radius-…)`).
- `ENTRY_OPENS_MINUTES_BEFORE = 10`.
- Token: `crypto.randomBytes(32).toString("base64url")`. Nunca loguear tokens ni `meetingUrl`.
- `meetingUrl` debe ser `https://` y nunca se envía al cliente público ni a correos.
- Pre-commit corre lint + typecheck + unit + e2e. **Nunca `--no-verify`.** Detener `npm run dev` antes de commitear.
- La DB local es la de **producción** (multi-tenant). La migración es aditiva; aplicarla requiere OK explícito de Jorge (Task 1, Step 4).
- Cobertura unit 90% en `lib/domain`, `lib/dto`, `lib/email`.

## Review Focus

1. **Link abierto por un escáner de correo o preview de WhatsApp dentro de la ventana** → marca "Entró" sin que la persona haya entrado. Aceptado (comentario `ponytail:` en el código); el test de la Task 6 fija que fuera de la ventana NO se registra entrada.
2. **Admin cambia la fecha del evento después de vender** → los links siguen siendo los mismos y la ventana se recalcula con la fecha nueva (la decisión lee `event.startsAt` en cada request). Test en Task 2 (`resolveEventEntry` no guarda estado).
3. **Admin desmarca "online" después de vender** → los links muestran "no es válido" en vez de redirigir a una URL vieja. Test en Task 2.
4. **Comprador reintenta el checkout (ticket PENDING reusado) con otra cantidad/asistentes** → los cupos se reemplazan, no se duplican. Test en Task 4.
5. **Re-compra ("Agregar más cupos") en evento online** → aparecen cupos nuevos sin datos y el correo de confirmación lista todos los links. Test en Task 5.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261020120000_add_event_online_attendees/migration.sql` | Campos `isOnline`/`meetingUrl` y modelo `EventAttendee` |
| `lib/domain/event.ts` | Tipos `Event` (+2 campos) y `EventAttendee` |
| `lib/domain/event-entry.ts` (+test) | `resolveEventEntry`, `ENTRY_OPENS_MINUTES_BEFORE` |
| `lib/ports/event-attendee-repository.ts` | Contrato del repositorio |
| `lib/adapters/db/event-attendee-repository.ts` | Implementación Prisma |
| `lib/dto/event-dto.ts` (+test) | `eventOnlineSchema` |
| `lib/dto/event-attendee-dto.ts` (+test) | `eventAttendeesSchema` (checkout) |
| `lib/application/get-video-providers.ts` | Zoom/Meet configurados del centro (reusado por agenda y eventos) |
| `lib/application/ensure-event-attendees.ts` (+test) | Completa cupos faltantes |
| `lib/application/send-event-online-reminders.ts` (+test) | Recordatorios de eventos online |
| `lib/utils/event-entry-url.ts` | URL absoluta del link personal |
| `lib/email/event.ts` (+test) | Bloque de links + correo por asistente + recordatorio |
| `app/panel/eventos/nuevo/EventOnlineField.tsx` | UI "Evento online" con autogeneración |
| `components/events/AttendeeFields.tsx` | Filas opcionales de asistentes en el checkout |
| `components/events/EntryLinksList.tsx` | "Tus entradas" con copiar |
| `app/eventos/entrar/[token]/page.tsx`, `WaitingRoom.tsx` | Link personal y sala de espera |
| `app/panel/eventos/[id]/AdminOnlineAttendees.tsx` | Tabla de asistentes online + revocar |
| `e2e/eventos-online.spec.ts` | Flujo completo |

---

### Task 1: Esquema, migración, tipos y repositorio

**Files:**
- Modify: `prisma/schema.prisma` (model `Event` ~l.724, model `EventTicket` ~l.749)
- Create: `prisma/migrations/20261020120000_add_event_online_attendees/migration.sql`
- Modify: `lib/domain/event.ts`
- Modify: `lib/adapters/db/event-repository.ts` (`toDomain`)
- Modify: `lib/ports/event-repository.ts` (`EventCreateInput`, `EventUpdateInput`)
- Create: `lib/ports/event-attendee-repository.ts`
- Create: `lib/adapters/db/event-attendee-repository.ts`
- Modify: `lib/adapters/db/index.ts`
- Modify: todo test/factory que construya un `Event` literal (typecheck los lista)

**Interfaces:**
- Produces: `Event.isOnline: boolean`, `Event.meetingUrl: string | null`; tipo `EventAttendee`; `eventAttendeeRepository` con `findByToken`, `findByTicketId`, `replaceForTicket`, `createMissingSeats`, `recordEntry`, `revoke`, `claimReminders`.

- [ ] **Step 1: Schema**

En `model Event`, después de `color String?`:

```prisma
  isOnline    Boolean     @default(false)
  meetingUrl  String?
```

En `model EventTicket`, en las relaciones (junto a `manualPayments`):

```prisma
  attendees      EventAttendee[]
```

Nuevo modelo al final del bloque de eventos:

```prisma
model EventAttendee {
  id             String    @id @default(cuid())
  ticketId       String
  seat           Int
  token          String    @unique
  name           String?
  email          String?
  firstEnteredAt DateTime?
  lastEnteredAt  DateTime?
  revokedAt      DateTime?
  reminderSentAt DateTime?
  createdAt      DateTime  @default(now())

  ticket EventTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@unique([ticketId, seat])
}
```

- [ ] **Step 2: Migración SQL a mano** (mismo estilo que `20260614120000_add_event_ticket_claim_token`)

```sql
-- AlterTable
ALTER TABLE "Event" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "meetingUrl" TEXT;

-- CreateTable
CREATE TABLE "EventAttendee" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "firstEnteredAt" TIMESTAMP(3),
    "lastEnteredAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendee_token_key" ON "EventAttendee"("token");
CREATE UNIQUE INDEX "EventAttendee_ticketId_seat_key" ON "EventAttendee"("ticketId", "seat");

-- AddForeignKey
ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "EventTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Validar el SQL contra el schema sin tocar la DB**

Run: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --script`
Si no hay shadow DB disponible, omitir y confiar en `prisma validate`: `npx prisma validate && npx prisma generate`
Expected: diff vacío (o `validate` OK) y cliente generado.

- [ ] **Step 4: Aplicar la migración — PEDIR OK A JORGE ANTES**

La DB es producción. Mostrar el SQL y esperar confirmación explícita. Luego:
Run: `npx prisma migrate deploy`
Expected: `1 migration applied: 20261020120000_add_event_online_attendees`.

- [ ] **Step 5: Tipos de dominio** (`lib/domain/event.ts`)

En `interface Event`, después de `color`:

```ts
  isOnline: boolean;
  /** Link real de la reunión. Sólo panel admin y la redirección del link personal. */
  meetingUrl: string | null;
```

Al final del archivo:

```ts
/** Un cupo de una entrada a evento online, con su link personal. */
export interface EventAttendee {
  id: string;
  ticketId: string;
  seat: number;
  token: string;
  name: string | null;
  email: string | null;
  firstEnteredAt: Date | null;
  lastEnteredAt: Date | null;
  revokedAt: Date | null;
}
```

- [ ] **Step 6: Event repository**

En `lib/adapters/db/event-repository.ts`, agregar al tipo de entrada de `toDomain` `isOnline: boolean; meetingUrl: string | null;` y al objeto devuelto `isOnline: r.isOnline, meetingUrl: r.meetingUrl,`.
En `lib/ports/event-repository.ts`, agregar a `EventCreateInput` y `EventUpdateInput`:

```ts
  isOnline?: boolean;
  meetingUrl?: string | null;
```

(`create`/`update` ya hacen spread de `data`; verificar que no filtren campos. Si arman el objeto campo a campo, agregar los dos.)

- [ ] **Step 7: Puerto** (`lib/ports/event-attendee-repository.ts`)

```ts
import type { EventAttendee } from "@/lib/domain/event";

export interface EventAttendeeInput {
  name: string | null;
  email: string | null;
}

export interface IEventAttendeeRepository {
  findByToken(token: string): Promise<EventAttendee | null>;
  findByTicketId(ticketId: string): Promise<EventAttendee[]>;
  /** Borra los cupos del ticket y crea uno por elemento (seat = índice + 1). */
  replaceForTicket(ticketId: string, seats: EventAttendeeInput[]): Promise<void>;
  /** Crea los cupos faltantes hasta `quantity` (idempotente). */
  createMissingSeats(ticketId: string, quantity: number): Promise<void>;
  recordEntry(id: string, at: Date): Promise<void>;
  /** Revoca sólo si el cupo pertenece a un evento del centro. Devuelve si revocó. */
  revoke(id: string, centerId: string): Promise<boolean>;
}
```

- [ ] **Step 8: Adapter** (`lib/adapters/db/event-attendee-repository.ts`)

```ts
import * as crypto from "node:crypto";
import type { IEventAttendeeRepository } from "@/lib/ports/event-attendee-repository";
import type { EventAttendee } from "@/lib/domain/event";
import { prisma } from "./prisma";

const newToken = () => crypto.randomBytes(32).toString("base64url");

const SELECT = {
  id: true,
  ticketId: true,
  seat: true,
  token: true,
  name: true,
  email: true,
  firstEnteredAt: true,
  lastEnteredAt: true,
  revokedAt: true,
} as const;

export const eventAttendeeRepository: IEventAttendeeRepository = {
  async findByToken(token) {
    return prisma.eventAttendee.findUnique({ where: { token }, select: SELECT }) as Promise<EventAttendee | null>;
  },

  async findByTicketId(ticketId) {
    return prisma.eventAttendee.findMany({ where: { ticketId }, select: SELECT, orderBy: { seat: "asc" } });
  },

  async replaceForTicket(ticketId, seats) {
    await prisma.$transaction([
      prisma.eventAttendee.deleteMany({ where: { ticketId } }),
      prisma.eventAttendee.createMany({
        data: seats.map((s, i) => ({ ticketId, seat: i + 1, token: newToken(), name: s.name, email: s.email })),
      }),
    ]);
  },

  async createMissingSeats(ticketId, quantity) {
    const last = await prisma.eventAttendee.aggregate({ where: { ticketId }, _max: { seat: true } });
    const from = (last._max.seat ?? 0) + 1;
    if (from > quantity) return;
    const data = [];
    for (let seat = from; seat <= quantity; seat++) data.push({ ticketId, seat, token: newToken() });
    // skipDuplicates: dos confirmaciones concurrentes no chocan en (ticketId, seat).
    await prisma.eventAttendee.createMany({ data, skipDuplicates: true });
  },

  async recordEntry(id, at) {
    await prisma.$executeRaw`UPDATE "EventAttendee" SET "firstEnteredAt" = COALESCE("firstEnteredAt", ${at}), "lastEnteredAt" = ${at} WHERE "id" = ${id}`;
  },

  async revoke(id, centerId) {
    const r = await prisma.eventAttendee.updateMany({
      where: { id, revokedAt: null, ticket: { event: { centerId } } },
      data: { revokedAt: new Date() },
    });
    return r.count > 0;
  },
};
```

En `lib/adapters/db/index.ts`, junto a `eventTicketRepository`:

```ts
export { eventAttendeeRepository } from "./event-attendee-repository";
```

- [ ] **Step 9: Typecheck y arreglar factories**

Run: `npm run typecheck`
Expected: errores sólo en literales de `Event` (p.ej. `makeEvent` en `lib/application/event-checkout.test.ts`). Agregar `isOnline: false, meetingUrl: null,` en cada uno y repetir hasta 0 errores.

- [ ] **Step 10: Unit tests verdes**

Run: `npm run test`
Expected: PASS (sin tests nuevos aún; nada debe romperse).

- [ ] **Step 11: Commit**

```bash
git add prisma lib/domain/event.ts lib/ports lib/adapters/db
git add -u
git commit -m "feat(eventos): modelo EventAttendee y campos de evento online"
```

---

### Task 2: Decisión del link personal (dominio puro)

**Files:**
- Create: `lib/domain/event-entry.ts`
- Test: `lib/domain/event-entry.test.ts`

**Interfaces:**
- Consumes: `EventStatus`, `EventTicketStatus` de `lib/domain/event.ts`
- Produces:
```ts
export const ENTRY_OPENS_MINUTES_BEFORE = 10;
export type EventEntryDecision =
  | { kind: "invalid" }
  | { kind: "cancelled" }
  | { kind: "ended" }
  | { kind: "waiting"; opensAt: Date }
  | { kind: "enter"; meetingUrl: string };
export function resolveEventEntry(input: EventEntryInput): EventEntryDecision;
```

- [ ] **Step 1: Test que falla**

```ts
import { describe, it, expect } from "vitest";
import { resolveEventEntry, ENTRY_OPENS_MINUTES_BEFORE, type EventEntryInput } from "./event-entry";

const startsAt = new Date("2026-11-01T22:00:00Z");
const endsAt = new Date("2026-11-01T23:30:00Z");
const MIN = 60_000;

function input(overrides: Partial<EventEntryInput> = {}): EventEntryInput {
  return {
    attendee: { revokedAt: null },
    ticketStatus: "PAID",
    event: { status: "PUBLISHED", isOnline: true, meetingUrl: "https://zoom.us/j/1", startsAt, endsAt },
    now: new Date(startsAt.getTime() - 5 * MIN),
    ...overrides,
  };
}

describe("resolveEventEntry", () => {
  it("dentro de la ventana → enter con el link real", () => {
    expect(resolveEventEntry(input())).toEqual({ kind: "enter", meetingUrl: "https://zoom.us/j/1" });
  });

  it("justo al abrir la ventana (10 min antes) → enter", () => {
    const now = new Date(startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * MIN);
    expect(resolveEventEntry(input({ now })).kind).toBe("enter");
  });

  it("un segundo antes de abrir → waiting con opensAt", () => {
    const now = new Date(startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * MIN - 1000);
    expect(resolveEventEntry(input({ now }))).toEqual({
      kind: "waiting",
      opensAt: new Date(startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * MIN),
    });
  });

  it("en endsAt exacto todavía entra; después → ended", () => {
    expect(resolveEventEntry(input({ now: endsAt })).kind).toBe("enter");
    expect(resolveEventEntry(input({ now: new Date(endsAt.getTime() + 1) })).kind).toBe("ended");
  });

  it("token inexistente → invalid", () => {
    expect(resolveEventEntry(input({ attendee: null })).kind).toBe("invalid");
  });

  it("cupo revocado → invalid", () => {
    expect(resolveEventEntry(input({ attendee: { revokedAt: new Date() } })).kind).toBe("invalid");
  });

  it.each(["PENDING", "CANCELLED", "REFUNDED"] as const)("ticket %s → invalid", (ticketStatus) => {
    expect(resolveEventEntry(input({ ticketStatus })).kind).toBe("invalid");
  });

  it("evento desmarcado como online o sin link → invalid", () => {
    const base = input().event!;
    expect(resolveEventEntry(input({ event: { ...base, isOnline: false } })).kind).toBe("invalid");
    expect(resolveEventEntry(input({ event: { ...base, meetingUrl: null } })).kind).toBe("invalid");
  });

  it("evento cancelado → cancelled (aunque el ticket esté cancelado)", () => {
    const base = input().event!;
    expect(
      resolveEventEntry(input({ event: { ...base, status: "CANCELLED" }, ticketStatus: "CANCELLED" })).kind
    ).toBe("cancelled");
  });

  it("la ventana se calcula con la fecha actual del evento (si el admin la mueve)", () => {
    const moved = { ...input().event!, startsAt: new Date(startsAt.getTime() + 60 * MIN), endsAt: new Date(endsAt.getTime() + 60 * MIN) };
    expect(resolveEventEntry(input({ event: moved })).kind).toBe("waiting");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run lib/domain/event-entry.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementación**

```ts
import type { EventStatus, EventTicketStatus } from "./event";

/** Minutos antes del inicio en que el link personal empieza a redirigir. */
export const ENTRY_OPENS_MINUTES_BEFORE = 10;

export interface EventEntryInput {
  attendee: { revokedAt: Date | null } | null;
  ticketStatus: EventTicketStatus | null;
  event: {
    status: EventStatus;
    isOnline: boolean;
    meetingUrl: string | null;
    startsAt: Date;
    endsAt: Date;
  } | null;
  now: Date;
}

export type EventEntryDecision =
  | { kind: "invalid" }
  | { kind: "cancelled" }
  | { kind: "ended" }
  | { kind: "waiting"; opensAt: Date }
  | { kind: "enter"; meetingUrl: string };

/** Qué ve un link personal en este momento. Sin estado: lee siempre la fecha actual del evento. */
export function resolveEventEntry({ attendee, ticketStatus, event, now }: EventEntryInput): EventEntryDecision {
  if (!attendee || !event) return { kind: "invalid" };
  if (event.status === "CANCELLED") return { kind: "cancelled" };
  if (attendee.revokedAt || ticketStatus !== "PAID" || !event.isOnline || !event.meetingUrl) {
    return { kind: "invalid" };
  }
  if (now.getTime() > event.endsAt.getTime()) return { kind: "ended" };
  const opensAt = new Date(event.startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * 60_000);
  if (now.getTime() < opensAt.getTime()) return { kind: "waiting", opensAt };
  return { kind: "enter", meetingUrl: event.meetingUrl };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run lib/domain/event-entry.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add lib/domain/event-entry.ts lib/domain/event-entry.test.ts
git commit -m "feat(eventos): decisión de acceso del link personal"
```

---

### Task 3: Configuración "Evento online" en el panel

**Files:**
- Modify: `lib/dto/event-dto.ts`, `lib/dto/event-dto.test.ts`
- Create: `lib/application/get-video-providers.ts`
- Modify: `app/panel/horarios/nueva/page.tsx` (usar el helper)
- Modify: `app/panel/eventos/actions.ts`
- Create: `app/panel/eventos/nuevo/EventOnlineField.tsx`
- Modify: `app/panel/eventos/nuevo/EventForm.tsx`, `app/panel/eventos/nuevo/page.tsx`, `app/panel/eventos/[id]/page.tsx`

**Interfaces:**
- Consumes: `Event.isOnline/meetingUrl` (Task 1); `createMeetingForClass(provider, { title, startTime, durationMinutes }): Promise<{ joinUrl }>` de `app/panel/horarios/actions.ts` (ya existe, exige admin).
- Produces: `eventOnlineSchema`; `getVideoProviders(centerId): Promise<VideoProviders>` con `type VideoProviders = { zoom: boolean; meet: boolean }`; prop `videoProviders` en `EventForm`.

- [ ] **Step 1: Test del DTO que falla** (agregar a `lib/dto/event-dto.test.ts`)

```ts
import { eventOnlineSchema } from "./event-dto";

describe("eventOnlineSchema", () => {
  it("presencial: limpia meetingUrl", () => {
    expect(eventOnlineSchema.parse({ isOnline: false, meetingUrl: "https://zoom.us/j/1" })).toEqual({
      isOnline: false,
      meetingUrl: null,
    });
  });

  it("online con link https → ok", () => {
    expect(eventOnlineSchema.parse({ isOnline: true, meetingUrl: " https://zoom.us/j/1 " })).toEqual({
      isOnline: true,
      meetingUrl: "https://zoom.us/j/1",
    });
  });

  it("online sin link → error con el copy de la agenda", () => {
    const r = eventOnlineSchema.safeParse({ isOnline: true, meetingUrl: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Genera el link o pega uno manualmente.");
  });

  it.each(["http://zoom.us/j/1", "javascript:alert(1)", "no es url"])("rechaza %s", (meetingUrl) => {
    expect(eventOnlineSchema.safeParse({ isOnline: true, meetingUrl }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run lib/dto/event-dto.test.ts`
Expected: FAIL (`eventOnlineSchema` no exportado).

- [ ] **Step 3: Implementar el schema** (al final de `lib/dto/event-dto.ts`)

```ts
const httpsUrl = z.string().trim().url().startsWith("https://");

export const eventOnlineSchema = z
  .object({ isOnline: z.boolean(), meetingUrl: httpsUrl.nullable().or(z.literal("").transform(() => null)) })
  .refine((d) => !d.isOnline || !!d.meetingUrl, {
    message: "Genera el link o pega uno manualmente.",
    path: ["meetingUrl"],
  })
  .transform((d) => ({ isOnline: d.isOnline, meetingUrl: d.isOnline ? d.meetingUrl : null }));
```

Run: `npx vitest run lib/dto/event-dto.test.ts` → PASS.

Nota: el caso presencial con `meetingUrl` válido pasa la validación de URL y luego el transform lo limpia; si llega un string inválido con `isOnline: false` falla la URL. Para que presencial nunca falle, el form manda `meetingUrl: null` cuando no es online (Step 6).

- [ ] **Step 4: Helper de proveedores** (`lib/application/get-video-providers.ts`)

```ts
import { zoomConfigRepository, googleMeetConfigRepository } from "@/lib/adapters/db";

export type VideoProviders = { zoom: boolean; meet: boolean };

/** Proveedores de videollamada habilitados y con credenciales para el centro. */
export async function getVideoProviders(centerId: string): Promise<VideoProviders> {
  const [zoom, meet] = await Promise.all([
    zoomConfigRepository.findStatusByCenterId(centerId),
    googleMeetConfigRepository.findStatusByCenterId(centerId),
  ]);
  return {
    zoom: !!(zoom?.enabled && zoom?.hasCredentials),
    meet: !!(meet?.enabled && meet?.hasCredentials),
  };
}
```

En `app/panel/horarios/nueva/page.tsx` reemplazar las dos consultas de status y el objeto `{ zoom, meet }` (l.18–28) por `getVideoProviders(centerId)` dentro del mismo `Promise.all`, y quitar los imports que queden sin uso.

- [ ] **Step 5: Server actions** (`app/panel/eventos/actions.ts`)

Agregar `isOnline: boolean; meetingUrl: string | null;` al tipo `data` de `createEvent` y `isOnline?: boolean; meetingUrl?: string | null;` al de `updateEvent`. Validar antes de persistir:

```ts
import { eventOnlineSchema } from "@/lib/dto/event-dto";

function parseOnline(data: { isOnline?: boolean; meetingUrl?: string | null }) {
  if (data.isOnline === undefined) return {};
  const parsed = eventOnlineSchema.safeParse({ isOnline: data.isOnline, meetingUrl: data.meetingUrl ?? null });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return parsed.data;
}
```

En `createEvent`: `const event = await eventRepository.create(centerId, { ...data, ...parseOnline(data) });`
En `updateEvent`: `await eventRepository.update(id, centerId, { ...data, ...parseOnline(data) });`

- [ ] **Step 6: Componente `EventOnlineField`** (`app/panel/eventos/nuevo/EventOnlineField.tsx`)

Lee título y fechas del `<form>` padre vía `formRef` (el form es no controlado). Al marcar el check genera el link automáticamente; si falla, no hay proveedor o faltan datos, muestra el campo manual.

```tsx
"use client";

import { useState, type RefObject } from "react";
import { createMeetingForClass } from "@/app/panel/horarios/actions";
import type { VideoProviders } from "@/lib/application/get-video-providers";

type Props = {
  idPrefix: string;
  formRef: RefObject<HTMLFormElement | null>;
  videoProviders: VideoProviders;
  initialIsOnline: boolean;
  initialMeetingUrl: string | null;
  onChange: (value: { isOnline: boolean; meetingUrl: string | null }) => void;
  error: string | null;
};

const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent";

function readMeetingParams(form: HTMLFormElement | null) {
  if (!form) return null;
  const fd = new FormData(form);
  const title = (fd.get("title") as string)?.trim();
  const startsAt = fd.get("startsAt") as string;
  const endsAt = fd.get("endsAt") as string;
  if (!title || !startsAt || !endsAt) return null;
  const start = new Date(startsAt);
  const durationMinutes = Math.max(1, Math.round((new Date(endsAt).getTime() - start.getTime()) / 60_000));
  return { title, startTime: start.toISOString(), durationMinutes };
}

export function EventOnlineField({ idPrefix, formRef, videoProviders, initialIsOnline, initialMeetingUrl, onChange, error }: Props) {
  const provider = videoProviders.zoom ? "zoom" : videoProviders.meet ? "meet" : null;
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(initialMeetingUrl);
  const [manualUrl, setManualUrl] = useState("");
  const [showManual, setShowManual] = useState(initialIsOnline && !initialMeetingUrl);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  function emit(next: { isOnline: boolean; generated: string | null; manual: string }) {
    onChange({ isOnline: next.isOnline, meetingUrl: next.isOnline ? next.manual.trim() || next.generated : null });
  }

  async function generate() {
    if (!provider) {
      setShowManual(true);
      return;
    }
    const params = readMeetingParams(formRef.current);
    if (!params) {
      setGenError("Completa título y fechas para generar el link.");
      setShowManual(true);
      return;
    }
    setLoading(true);
    setGenError(null);
    try {
      const { joinUrl } = await createMeetingForClass(provider, params);
      setGeneratedUrl(joinUrl);
      setManualUrl("");
      setShowManual(false);
      emit({ isOnline: true, generated: joinUrl, manual: "" });
    } catch {
      setGenError("No pudimos generar el link. Pega el link de la reunión.");
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  }

  function toggle(checked: boolean) {
    setIsOnline(checked);
    emit({ isOnline: checked, generated: generatedUrl, manual: manualUrl });
    if (checked && !generatedUrl) void generate();
  }

  const providerLabel = provider === "zoom" ? "Zoom" : "Meet";

  return (
    <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <input type="checkbox" checked={isOnline} onChange={(e) => toggle(e.target.checked)} />
        Evento online
      </label>

      {isOnline && (
        <div className="space-y-2" aria-live="polite">
          {loading && <p className="text-sm text-[var(--color-text-muted)]">Generando link…</p>}

          {generatedUrl && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all text-sm text-[var(--color-text)]">{generatedUrl}</span>
              {provider && (
                <button type="button" onClick={generate} className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-2">
                  Regenerar
                </button>
              )}
            </div>
          )}

          {!provider && !generatedUrl && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Conecta Zoom o Meet en Plugins para generar el link automáticamente, o pégalo aquí.
            </p>
          )}
          {genError && <p className="text-sm text-[var(--color-error)]">{genError}</p>}

          {showManual && (
            <div>
              <label htmlFor={`${idPrefix}-meetingUrl`} className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Pega el link de la reunión
              </label>
              <input
                id={`${idPrefix}-meetingUrl`}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={manualUrl}
                onChange={(e) => {
                  setManualUrl(e.target.value);
                  emit({ isOnline: true, generated: generatedUrl, manual: e.target.value });
                }}
                aria-describedby={error ? `${idPrefix}-meetingUrl-error` : undefined}
                className={INPUT_CLASS}
              />
              {provider && (
                <button type="button" onClick={generate} disabled={loading} className="mt-2 text-sm font-medium text-[var(--color-primary)] underline underline-offset-2">
                  Reintentar con {providerLabel}
                </button>
              )}
            </div>
          )}

          {error && (
            <p id={`${idPrefix}-meetingUrl-error`} role="alert" className="text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 7: Integrar en `EventForm`**

- Props: agregar `videoProviders: VideoProviders` a ambas variantes (`type Props = ({ mode: "create" } | { mode: "edit"; event: Event }) & { videoProviders: VideoProviders }`).
- Estado: `const formRef = useRef<HTMLFormElement>(null);` `const [online, setOnline] = useState({ isOnline: event?.isOnline ?? false, meetingUrl: event?.meetingUrl ?? null });` `const [onlineError, setOnlineError] = useState<string | null>(null);`
- En `handleSubmit`, antes de armar `data`:

```ts
    if (online.isOnline && !online.meetingUrl) {
      setOnlineError("Genera el link o pega uno manualmente.");
      return;
    }
    setOnlineError(null);
```

  y agregar al objeto `data`: `isOnline: online.isOnline, meetingUrl: online.isOnline ? online.meetingUrl : null,`
- `<form ref={formRef} …>` y, después del bloque "Ubicación":

```tsx
        <EventOnlineField
          idPrefix={idPrefix}
          formRef={formRef}
          videoProviders={props.videoProviders}
          initialIsOnline={event?.isOnline ?? false}
          initialMeetingUrl={event?.meetingUrl ?? null}
          onChange={setOnline}
          error={onlineError}
        />
```

- En `app/panel/eventos/nuevo/page.tsx` y `app/panel/eventos/[id]/page.tsx`: obtener `const videoProviders = await getVideoProviders(centerId);` (en `[id]` sólo dentro de la rama admin, sumado al `Promise.all` existente si es posible) y pasarlo: `<EventForm mode="edit" event={event} videoProviders={videoProviders} />`.

- [ ] **Step 8: Verificación**

Run: `npm run typecheck && npm run lint && npx vitest run lib/dto/event-dto.test.ts`
Expected: todo OK.
Manual (`npm run dev`, centro con Zoom conectado): crear evento con título y fechas → marcar "Evento online" → aparece "Generando link…" y luego el link. Sin título → mensaje + campo manual. Guardar con online y sin link → error. Detener el dev server al terminar.

- [ ] **Step 9: Commit**

```bash
git add lib/dto/event-dto.ts lib/dto/event-dto.test.ts lib/application/get-video-providers.ts app/panel/horarios/nueva/page.tsx app/panel/eventos
git commit -m "feat(eventos): marcar evento como online con link autogenerado de Zoom/Meet"
```

---

### Task 4: Asistentes opcionales en el checkout

**Files:**
- Create: `lib/dto/event-attendee-dto.ts`, `lib/dto/event-attendee-dto.test.ts`
- Modify: `lib/dto/guest-checkout-dto.ts`
- Modify: `app/api/events/[id]/checkout/route.ts`
- Modify: `lib/application/event-checkout.ts`, `lib/application/event-checkout.test.ts`
- Create: `components/events/AttendeeFields.tsx`
- Modify: `app/eventos/[id]/GuestCheckoutForm.tsx`, `app/eventos/[id]/EventPurchasePanel.tsx`, `app/eventos/[id]/page.tsx`
- Modify: `app/panel/eventos/[id]/ComprarEventoButton.tsx`, `app/panel/eventos/[id]/page.tsx`

**Interfaces:**
- Consumes: `eventAttendeeRepository.replaceForTicket(ticketId, seats: EventAttendeeInput[])` (Task 1).
- Produces: `eventAttendeesSchema` (array opcional de `{ name: string | null; email: string | null }`, representa los cupos 2…N); `CreateEventCheckoutInput.attendees?: EventAttendeeInput[]`; componente `AttendeeFields`.

Decisión de UX: el cupo 1 es el comprador ("Entrada 1 · tú"), sin inputs. Las filas 2…N son opcionales. Equivale a la fila 1 precargada del spec, con menos campos.

- [ ] **Step 1: Test del DTO que falla** (`lib/dto/event-attendee-dto.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { eventAttendeesSchema } from "./event-attendee-dto";

describe("eventAttendeesSchema", () => {
  it("undefined → undefined (compra sin asistentes)", () => {
    expect(eventAttendeesSchema.parse(undefined)).toBeUndefined();
  });

  it("normaliza vacíos a null y el correo a minúsculas", () => {
    expect(
      eventAttendeesSchema.parse([
        { name: "  Ana  ", email: " Ana@Correo.CL " },
        { name: "", email: "" },
        {},
      ])
    ).toEqual([
      { name: "Ana", email: "ana@correo.cl" },
      { name: null, email: null },
      { name: null, email: null },
    ]);
  });

  it("correo inválido → error", () => {
    expect(eventAttendeesSchema.safeParse([{ email: "no-es-correo" }]).success).toBe(false);
  });

  it("máximo 199 filas (cupos 2…200)", () => {
    expect(eventAttendeesSchema.safeParse(Array(200).fill({})).success).toBe(false);
  });
});
```

Run: `npx vitest run lib/dto/event-attendee-dto.test.ts` → FAIL.

- [ ] **Step 2: Implementar** (`lib/dto/event-attendee-dto.ts`)

```ts
/**
 * Asistentes opcionales de una compra de evento online. Cada elemento es un
 * cupo adicional (2…N); el cupo 1 es siempre el comprador.
 */
import { z } from "zod";

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : v);

const optionalName = z.preprocess(trimmed, z.string().max(120).optional()).transform((v) => v || null);
const optionalEmail = z
  .preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.union([z.literal(""), z.string().email().max(200)]).optional())
  .transform((v) => v || null);

export const eventAttendeesSchema = z
  .array(z.object({ name: optionalName, email: optionalEmail }))
  .max(199)
  .optional();

export type EventAttendeesBody = z.infer<typeof eventAttendeesSchema>;
```

Run: `npx vitest run lib/dto/event-attendee-dto.test.ts` → PASS.

- [ ] **Step 3: Aceptar `attendees` en el API**

`lib/dto/guest-checkout-dto.ts`: agregar `attendees: eventAttendeesSchema,` al objeto (import de `./event-attendee-dto`).
`app/api/events/[id]/checkout/route.ts`:
- `checkoutBodySchema`: agregar `attendees: eventAttendeesSchema,`.
- En `handleAuthenticated`: pasar `attendees: parsedBody?.attendees` a `createEventCheckout`.
- En `handleGuest`: desestructurar `attendees` de `parsed.data` y pasarlo.

- [ ] **Step 4: Test del caso de uso que falla** (agregar a `lib/application/event-checkout.test.ts`)

Agregar a `mocks`: `eventAttendeeRepository: { replaceForTicket: vi.fn() },` y al `vi.mock("@/lib/adapters/db", …)`: `eventAttendeeRepository: mocks.eventAttendeeRepository,`.

```ts
  describe("evento online: asistentes", () => {
    const extra = [{ name: "Ana", email: "ana@correo.cl" }];

    it("guarda el cupo 1 (comprador) + asistentes, recortado a la cantidad", async () => {
      mocks.eventRepository.findById.mockResolvedValue(makeEvent({ isOnline: true, meetingUrl: "https://zoom.us/j/1" }));
      await createEventCheckout({
        ...BASE_INPUT,
        quantity: 2,
        attendees: [...extra, { name: "Sobra", email: null }],
      });
      expect(mocks.eventAttendeeRepository.replaceForTicket).toHaveBeenCalledWith("ticket-1", [
        { name: null, email: null },
        { name: "Ana", email: "ana@correo.cl" },
      ]);
    });

    it("reintento con ticket PENDING reusado reemplaza los cupos (no duplica)", async () => {
      mocks.eventRepository.findById.mockResolvedValue(makeEvent({ isOnline: true, meetingUrl: "https://zoom.us/j/1" }));
      mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(makeTicket({ status: "PENDING" }));
      await createEventCheckout({ ...BASE_INPUT, quantity: 1, attendees: extra });
      expect(mocks.eventTicketRepository.resetPending).toHaveBeenCalled();
      expect(mocks.eventAttendeeRepository.replaceForTicket).toHaveBeenCalledWith("ticket-1", [{ name: null, email: null }]);
    });

    it("evento presencial: no toca asistentes", async () => {
      await createEventCheckout({ ...BASE_INPUT, attendees: extra });
      expect(mocks.eventAttendeeRepository.replaceForTicket).not.toHaveBeenCalled();
    });
  });
```

Run: `npx vitest run lib/application/event-checkout.test.ts` → FAIL.

- [ ] **Step 5: Implementar en `event-checkout.ts`**

- Import: `eventAttendeeRepository` en el import de `@/lib/adapters/db`; `import type { EventAttendeeInput } from "@/lib/ports/event-attendee-repository";` y `import type { Event, EventTicket } from "@/lib/domain/event";`.
- En `CreateEventCheckoutInput`:

```ts
  /** Evento online: datos opcionales de los cupos 2…N (el cupo 1 es el comprador). */
  attendees?: EventAttendeeInput[];
```

- Helper:

```ts
/** Evento online: deja un cupo por entrada con los datos opcionales recibidos. */
async function saveCheckoutAttendees(event: Event, ticketId: string, quantity: number, extra: EventAttendeeInput[] = []) {
  if (!event.isOnline) return;
  const seats = [{ name: null, email: null }, ...extra.slice(0, quantity - 1)];
  await eventAttendeeRepository.replaceForTicket(ticketId, seats);
}
```

- Llamarlo inmediatamente después de **cada** `upsertTicket(...)` del modo purchase (gratis — antes de `updateStatus` —, transferencia y MP):

```ts
    await saveCheckoutAttendees(event, pending.id, quantity, input.attendees);
```

  (usar la variable del ticket de cada rama: `pending.id` en gratis, `ticket.id` en transferencia y MP).

Run: `npx vitest run lib/application/event-checkout.test.ts` → PASS (todos, incluidos los existentes).

- [ ] **Step 6: Componente `AttendeeFields`** (`components/events/AttendeeFields.tsx`)

```tsx
"use client";

import { useId } from "react";
import type { EventAttendeeInput } from "@/lib/ports/event-attendee-repository";

type Props = {
  quantity: number;
  value: EventAttendeeInput[];
  onChange: (value: EventAttendeeInput[]) => void;
  disabled?: boolean;
};

const INPUT =
  "min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]";

/** Filas opcionales de nombre/correo para los cupos 2…N de un evento online. */
export function AttendeeFields({ quantity, value, onChange, disabled }: Props) {
  const id = useId();
  if (quantity < 2) return null;

  const rows = Array.from({ length: quantity - 1 }, (_, i) => value[i] ?? { name: null, email: null });
  const update = (i: number, patch: Partial<EventAttendeeInput>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <fieldset className="flex flex-col gap-[var(--space-3)]">
      <legend className="text-sm font-medium text-[var(--color-text)]">Asistentes (opcional)</legend>
      <p className="text-xs text-[var(--color-text-muted)]">
        Si dejas su correo, le enviamos su link directo. Si no, te llegan todos a ti.
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">Entrada 1 · tú</p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name-${i}`} className="text-sm text-[var(--color-text)]">
              Entrada {i + 2} · nombre
            </label>
            <input id={`${id}-name-${i}`} type="text" autoComplete="off" disabled={disabled}
              value={r.name ?? ""} onChange={(e) => update(i, { name: e.target.value })} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-email-${i}`} className="text-sm text-[var(--color-text)]">
              Entrada {i + 2} · correo
            </label>
            <input id={`${id}-email-${i}`} type="email" autoComplete="off" disabled={disabled}
              value={r.email ?? ""} onChange={(e) => update(i, { email: e.target.value })} className={INPUT} />
          </div>
        </div>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 7: Usarlo en ambos checkouts**

- `app/eventos/[id]/page.tsx`: pasar `isOnline={event.isOnline}` a `EventPurchasePanel`. `EventPurchasePanel`: agregar `isOnline: boolean` a `Props` y pasarlo a `GuestCheckoutForm` y a `ComprarEventoButton`.
- `GuestCheckoutForm`: prop `isOnline: boolean`; estado `const [attendees, setAttendees] = useState<EventAttendeeInput[]>([]);`; renderizar `{isOnline && <AttendeeFields quantity={quantity} value={attendees} onChange={setAttendees} disabled={loading} />}` después de los campos del comprador; en el body: `JSON.stringify({ name, email, phone, quantity, attendees: isOnline ? attendees.slice(0, quantity - 1) : undefined })`. Cambiar el texto final a `isOnline ? "Te enviaremos tus links de acceso a este correo." : "Te enviaremos tu entrada a este correo."`.
- `ComprarEventoButton`: prop opcional `isOnline?: boolean` (default `false`); mismo estado; renderizar `AttendeeFields` sólo si `isOnline && mode === "purchase"`, en una fila completa bajo el stepper (envolver el return en `<div className="flex flex-col gap-3">`); body: `JSON.stringify({ quantity, mode, attendees: isOnline && mode === "purchase" ? attendees.slice(0, quantity - 1) : undefined })`.
- `app/panel/eventos/[id]/page.tsx` (vista alumno): pasar `isOnline={event.isOnline}` al `ComprarEventoButton` de compra inicial.

- [ ] **Step 8: Verificación**

Run: `npm run typecheck && npm run lint && npx vitest run lib/dto lib/application/event-checkout.test.ts`
Expected: OK.

- [ ] **Step 9: Commit**

```bash
git add lib/dto app/api/events lib/application/event-checkout.ts lib/application/event-checkout.test.ts components/events app/eventos app/panel/eventos
git commit -m "feat(eventos): asistentes opcionales al comprar entradas de eventos online"
```

---

### Task 5: Completar cupos al confirmar + correos con links

**Files:**
- Create: `lib/utils/event-entry-url.ts`
- Create: `lib/application/ensure-event-attendees.ts`, `lib/application/ensure-event-attendees.test.ts`
- Modify: `lib/application/notify-event-ticket-confirmation.ts`
- Modify: `lib/email/event.ts`, `lib/email/event.test.ts` (crear si no existe; ya existe según `ls lib/email`)

**Interfaces:**
- Consumes: `eventAttendeeRepository.createMissingSeats/findByTicketId` (Task 1); `eventTicketRepository.findByEventAndUser` (existente).
- Produces:
```ts
export function eventEntryUrl(token: string): string;           // lib/utils/event-entry-url.ts
export async function ensureEventAttendees(ticket: { id: string; quantity: number }, event: { isOnline: boolean }): Promise<EventAttendee[]>;
export type EntryLink = { label: string; url: string };          // lib/email/event.ts
export function entryLinksFor(attendees: EventAttendee[], buyerEmail: string): EntryLink[];
// EventTicketConfirmationEmailData.entryLinks?: EntryLink[]
export function buildEventAttendeeLinkEmail(data: EventAttendeeLinkEmailData): SendEmailDto;
export function buildEventOnlineReminderEmail(data: EventOnlineReminderEmailData): SendEmailDto;
```

- [ ] **Step 1: URL helper** (`lib/utils/event-entry-url.ts`)

```ts
import { getBaseUrl } from "./base-url";

/** URL absoluta del link personal de un cupo de evento online. */
export const eventEntryUrl = (token: string) => `${getBaseUrl()}/eventos/entrar/${token}`;
```

- [ ] **Step 2: Test de `ensureEventAttendees` que falla**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureEventAttendees } from "./ensure-event-attendees";

const mocks = vi.hoisted(() => ({
  eventAttendeeRepository: { createMissingSeats: vi.fn(), findByTicketId: vi.fn() },
}));
vi.mock("@/lib/adapters/db", () => ({ eventAttendeeRepository: mocks.eventAttendeeRepository }));

describe("ensureEventAttendees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventAttendeeRepository.findByTicketId.mockResolvedValue([{ id: "a1", seat: 1 }]);
  });

  it("evento online: completa hasta quantity y devuelve los cupos", async () => {
    const result = await ensureEventAttendees({ id: "t1", quantity: 3 }, { isOnline: true });
    expect(mocks.eventAttendeeRepository.createMissingSeats).toHaveBeenCalledWith("t1", 3);
    expect(result).toEqual([{ id: "a1", seat: 1 }]);
  });

  it("evento presencial: no hace nada", async () => {
    expect(await ensureEventAttendees({ id: "t1", quantity: 3 }, { isOnline: false })).toEqual([]);
    expect(mocks.eventAttendeeRepository.createMissingSeats).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run lib/application/ensure-event-attendees.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
import { eventAttendeeRepository } from "@/lib/adapters/db";
import type { EventAttendee } from "@/lib/domain/event";

/**
 * Asegura un cupo (con link personal) por cada entrada de un ticket de evento
 * online. Idempotente: se llama en cada confirmación y al mostrar la confirmación.
 */
export async function ensureEventAttendees(
  ticket: { id: string; quantity: number },
  event: { isOnline: boolean }
): Promise<EventAttendee[]> {
  if (!event.isOnline) return [];
  await eventAttendeeRepository.createMissingSeats(ticket.id, ticket.quantity);
  return eventAttendeeRepository.findByTicketId(ticket.id);
}
```

Run → PASS.

- [ ] **Step 4: Tests de correo que fallan** (agregar a `lib/email/event.test.ts`; reusar el `branding` de prueba que ya define ese archivo, o crear uno con la misma forma que usan los otros tests de `lib/email`)

```ts
import {
  buildEventTicketConfirmationEmail,
  buildEventAttendeeLinkEmail,
  buildEventOnlineReminderEmail,
  entryLinksFor,
} from "./event";

const attendees = [
  { id: "a1", ticketId: "t1", seat: 1, token: "tok1", name: null, email: null, firstEnteredAt: null, lastEnteredAt: null, revokedAt: null },
  { id: "a2", ticketId: "t1", seat: 2, token: "tok2", name: "Ana", email: "ana@correo.cl", firstEnteredAt: null, lastEnteredAt: null, revokedAt: null },
];

describe("entryLinksFor", () => {
  it("etiqueta 'Entrada N' con el nombre si existe", () => {
    const links = entryLinksFor(attendees, "yo@correo.cl");
    expect(links.map((l) => l.label)).toEqual(["Entrada 1 · tú", "Entrada 2 · Ana"]);
    expect(links[1].url).toMatch(/\/eventos\/entrar\/tok2$/);
  });
});

describe("confirmación con links", () => {
  const base = {
    toEmail: "yo@correo.cl",
    eventTitle: "Círculo online",
    startsAt: new Date("2026-11-01T22:00:00Z"),
    endsAt: new Date("2026-11-01T23:00:00Z"),
    location: null,
    amountCents: 0,
    currency: "CLP",
    branding,
  };

  it("incluye 'Tus entradas' y cada link cuando hay entryLinks", () => {
    const email = buildEventTicketConfirmationEmail({ ...base, quantity: 2, entryLinks: entryLinksFor(attendees, "yo@correo.cl") });
    expect(email.html).toContain("Tus entradas");
    expect(email.html).toContain("/eventos/entrar/tok1");
    expect(email.text).toContain("/eventos/entrar/tok2");
  });

  it("sin entryLinks no agrega el bloque (evento presencial)", () => {
    expect(buildEventTicketConfirmationEmail(base).html).not.toContain("Tus entradas");
  });
});

describe("buildEventAttendeeLinkEmail", () => {
  it("va al asistente con su link y menciona al comprador", () => {
    const email = buildEventAttendeeLinkEmail({
      toEmail: "ana@correo.cl",
      attendeeName: "Ana",
      buyerName: "Jorge",
      eventTitle: "Círculo online",
      startsAt: new Date("2026-11-01T22:00:00Z"),
      entryUrl: "https://x.cl/eventos/entrar/tok2",
      branding,
    });
    expect(email.to).toEqual(["ana@correo.cl"]);
    expect(email.subject).toBe("Tienes una entrada para Círculo online");
    expect(email.html).toContain("https://x.cl/eventos/entrar/tok2");
    expect(email.html).toContain("Jorge");
  });

  it("escapa HTML en nombres", () => {
    const email = buildEventAttendeeLinkEmail({
      toEmail: "a@b.cl", attendeeName: "<b>x</b>", buyerName: "J", eventTitle: "E",
      startsAt: new Date(), entryUrl: "https://x.cl/eventos/entrar/t", branding,
    });
    expect(email.html).not.toContain("<b>x</b>");
  });
});

describe("buildEventOnlineReminderEmail", () => {
  it("lista todos los links recibidos", () => {
    const email = buildEventOnlineReminderEmail({
      toEmail: "yo@correo.cl",
      userName: "Jorge",
      eventTitle: "Círculo online",
      startsAt: new Date("2026-11-01T22:00:00Z"),
      entryLinks: entryLinksFor(attendees, "yo@correo.cl"),
      branding,
    });
    expect(email.subject).toBe("Hoy: Círculo online");
    expect(email.html).toContain("/eventos/entrar/tok1");
    expect(email.html).toContain("/eventos/entrar/tok2");
  });
});
```

Run: `npx vitest run lib/email/event.test.ts` → FAIL.

- [ ] **Step 5: Implementar en `lib/email/event.ts`**

Imports: `import type { EventAttendee } from "@/lib/domain/event";` y `import { eventEntryUrl } from "@/lib/utils/event-entry-url";`.

```ts
export type EntryLink = { label: string; url: string };

/** Links personales para mostrar al comprador ("Entrada 1 · tú", "Entrada 2 · Ana"). */
export function entryLinksFor(attendees: EventAttendee[], buyerEmail: string): EntryLink[] {
  return attendees.map((a) => {
    const who = a.seat === 1 || a.email === buyerEmail ? "tú" : (a.name ?? a.email);
    return { label: who ? `Entrada ${a.seat} · ${who}` : `Entrada ${a.seat}`, url: eventEntryUrl(a.token) };
  });
}

function entryLinksHtml(links: EntryLink[], colorPrimary: string): string {
  const rows = links
    .map(
      (l) =>
        `<p style="margin:8px 0 0;font-size:14px;"><strong style="color:#2A2A2A;">${escapeHtml(l.label)}</strong><br><a href="${l.url}" style="color:${colorPrimary};word-break:break-all;">${l.url}</a></p>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" style="margin:16px 0;border:1px solid #E5DED3;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${colorPrimary};">Tus entradas</p>
        <p style="margin:4px 0 0;font-size:13px;color:#8A8782;">Cada link es personal. La sala se abre 10 minutos antes.</p>
        ${rows}
      </td></tr>
    </table>`;
}

const entryLinksText = (links: EntryLink[]) => links.map((l) => `${l.label}: ${l.url}`).join("\n");
```

En `EventTicketConfirmationEmailData` agregar:

```ts
  /** Evento online: links personales de cada cupo. */
  entryLinks?: EntryLink[];
```

En `buildEventTicketConfirmationEmail`: después de `${ctaLine}` en `body` agregar `${data.entryLinks?.length ? entryLinksHtml(data.entryLinks, branding.colorPrimary) : ""}`; en `textLines`, antes de `— ${branding.centerName}`, agregar `data.entryLinks?.length ? \`Tus entradas:\n${entryLinksText(data.entryLinks)}\` : "",`.

Nuevos builders:

```ts
export interface EventAttendeeLinkEmailData {
  toEmail: string;
  attendeeName: string | null;
  buyerName: string;
  eventTitle: string;
  startsAt: Date;
  entryUrl: string;
  branding: EmailBranding;
}

export function buildEventAttendeeLinkEmail(data: EventAttendeeLinkEmailData): SendEmailDto {
  const { branding } = data;
  const when = formatLongDateTime(data.startsAt, branding.timezone);
  const greeting = data.attendeeName ? `Hola ${escapeHtml(data.attendeeName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>${escapeHtml(data.buyerName)} te regaló una entrada para <strong>${escapeHtml(data.eventTitle)}</strong>, el ${escapeHtml(when)}.</p>
    <p>Este es tu link personal. La sala se abre 10 minutos antes:</p>
    <p style="text-align:center;margin:24px 0;"><a href="${data.entryUrl}" style="${emailCtaStyle(branding.colorSecondary)}">Entrar al evento</a></p>
    <p style="font-size:13px;color:#8A8782;word-break:break-all;">${data.entryUrl}</p>`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Tienes una entrada para ${data.eventTitle}`,
    html: emailBaseLayout({ body, branding }),
    text: [`${greeting},`, `${data.buyerName} te regaló una entrada para ${data.eventTitle} (${when}).`, `Tu link personal: ${data.entryUrl}`, `— ${branding.centerName}`].join("\n"),
  };
}

export interface EventOnlineReminderEmailData {
  toEmail: string;
  userName: string | null;
  eventTitle: string;
  startsAt: Date;
  entryLinks: EntryLink[];
  preferencesUrl?: string;
  branding: EmailBranding;
}

export function buildEventOnlineReminderEmail(data: EventOnlineReminderEmailData): SendEmailDto {
  const { branding } = data;
  const when = formatLongDateTime(data.startsAt, branding.timezone);
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p><strong>${escapeHtml(data.eventTitle)}</strong> es hoy, ${escapeHtml(when)}. ¡Te esperamos!</p>
    ${entryLinksHtml(data.entryLinks, branding.colorPrimary)}`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Hoy: ${data.eventTitle}`,
    html: emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl }),
    text: [`${greeting},`, `${data.eventTitle} es hoy, ${when}.`, entryLinksText(data.entryLinks), `— ${branding.centerName}`].join("\n"),
  };
}
```

Nota: `entryLinksHtml` siempre dice "Tus entradas"; en el correo de recordatorio a un asistente con un solo link igual se lee bien.

Run: `npx vitest run lib/email/event.test.ts` → PASS.

- [ ] **Step 6: Integrar en `notifyEventTicketConfirmation`**

```ts
import { eventRepository, eventTicketRepository, userRepository } from "@/lib/adapters/db";
import { ensureEventAttendees } from "./ensure-event-attendees";
import { buildEventTicketConfirmationEmail, buildEventAttendeeLinkEmail, entryLinksFor, type EventTicketConfirmationKind } from "@/lib/email/event";
import { eventEntryUrl } from "@/lib/utils/event-entry-url";
```

Después de `if (!event || !user) return;`:

```ts
  const ticket = event.isOnline ? await eventTicketRepository.findByEventAndUser(event.id, user.id) : null;
  const attendees = ticket
    ? await ensureEventAttendees(ticket, event).catch((err) => {
        console.error("[notify-event-ticket] ensure attendees", err instanceof Error ? err.message : err);
        return [];
      })
    : [];
```

En el objeto de `buildEventTicketConfirmationEmail` agregar `entryLinks: attendees.length ? entryLinksFor(attendees, user.email) : undefined,`.

Después de enviar al comprador:

```ts
  // Compra inicial: cada asistente con correo propio recibe su link directo.
  if ((input.kind ?? "purchase") === "purchase") {
    const buyerName = user.name ?? user.email.split("@")[0];
    for (const a of attendees) {
      if (!a.email || a.email === user.email) continue;
      sendEmailSafe(
        buildEventAttendeeLinkEmail({
          toEmail: a.email,
          attendeeName: a.name,
          buyerName,
          eventTitle: event.title,
          startsAt: event.startsAt,
          entryUrl: eventEntryUrl(a.token),
          branding,
        })
      );
    }
  }
```

Re-compra (Review Focus #5): el ticket ya tiene `quantity` actualizada cuando se llama a notify (gratis: tras `incrementQuantity`; MP: tras `applyApprovedPayment`), así que `ensureEventAttendees` crea los cupos nuevos y el correo de "addition" lista todos los links. Verificar en `lib/application/checkout.ts:466` (webhook) que notify se llama después de aplicar el pago; si no, mover la llamada.

- [ ] **Step 7: Verificación**

Run: `npm run typecheck && npx vitest run lib/application lib/email`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/utils/event-entry-url.ts lib/application/ensure-event-attendees.ts lib/application/ensure-event-attendees.test.ts lib/application/notify-event-ticket-confirmation.ts lib/email/event.ts lib/email/event.test.ts
git commit -m "feat(eventos): links personales en la confirmación y correo a cada asistente"
```

---

### Task 6: Link personal y sala de espera

**Files:**
- Create: `app/eventos/entrar/[token]/page.tsx`
- Create: `app/eventos/entrar/[token]/WaitingRoom.tsx`

**Interfaces:**
- Consumes: `resolveEventEntry`, `ENTRY_OPENS_MINUTES_BEFORE` (Task 2); `eventAttendeeRepository.findByToken/recordEntry` (Task 1); `eventTicketRepository.findById`, `eventRepository.findById`, `siteConfigRepository.findByCenterId` (existentes); `getCenterTimezone`.
- Produces: ruta pública `/eventos/entrar/[token]`.

- [ ] **Step 1: Página**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eventAttendeeRepository, eventRepository, eventTicketRepository, siteConfigRepository } from "@/lib/adapters/db";
import { resolveEventEntry } from "@/lib/domain/event-entry";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import { WaitingRoom } from "./WaitingRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

async function load(token: string) {
  const attendee = await eventAttendeeRepository.findByToken(token);
  if (!attendee) return { attendee: null, ticket: null, event: null };
  const ticket = await eventTicketRepository.findById(attendee.ticketId);
  const event = ticket ? await eventRepository.findById(ticket.eventId) : null;
  return { attendee, ticket, event };
}

export default async function EventEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { attendee, ticket, event } = await load(token);
  const decision = resolveEventEntry({ attendee, ticketStatus: ticket?.status ?? null, event, now: new Date() });

  if (decision.kind === "enter") {
    // ponytail: un escáner de correo o preview de WhatsApp dentro de la ventana marca "Entró"; aceptable para Trini.
    await eventAttendeeRepository.recordEntry(attendee!.id, new Date());
    redirect(decision.meetingUrl);
  }

  if (decision.kind === "waiting") {
    const tz = await getCenterTimezone(event!.centerId);
    return (
      <WaitingRoom
        eventTitle={event!.title}
        attendeeName={attendee!.name}
        startsAtIso={event!.startsAt.toISOString()}
        opensAtIso={decision.opensAt.toISOString()}
        timeZone={tz}
      />
    );
  }

  const whatsappUrl = event ? (await siteConfigRepository.findByCenterId(event.centerId))?.whatsappUrl : null;
  const message = {
    invalid: "Este link no es válido.",
    cancelled: "Este evento fue cancelado.",
    ended: "Este evento ya terminó.",
  }[decision.kind];

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-[var(--space-4)] py-[var(--space-16)] text-center">
      <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">{message}</h1>
      {decision.kind === "invalid" && (
        <p className="mt-[var(--space-3)] text-[var(--color-text-muted)]">
          Revisa que sea el link que te llegó por correo.
        </p>
      )}
      {whatsappUrl && decision.kind !== "ended" && (
        <a href={whatsappUrl} className="mt-[var(--space-6)] font-medium text-[var(--color-primary)] underline underline-offset-4">
          Escribir por WhatsApp
        </a>
      )}
    </main>
  );
}
```

(`siteConfigRepository.findByCenterId` existe en `lib/adapters/db/site-config-repository.ts:77`. El CTA dice "Escribir por WhatsApp", neutro en número, porque el SaaS sirve a centros de una o varias personas.)

- [ ] **Step 2: Sala de espera** (`WaitingRoom.tsx`)

`timeZone` llega como prop desde el server (TZ del centro del evento), así no depende del provider público.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventTitle: string;
  attendeeName: string | null;
  startsAtIso: string;
  opensAtIso: string;
  timeZone: string;
};

const REFRESH_FALLBACK_MS = 60_000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d} d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function WaitingRoom({ eventTitle, attendeeName, startsAtIso, opensAtIso, timeZone }: Props) {
  const router = useRouter();
  const opensAt = new Date(opensAtIso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const fallback = setInterval(() => router.refresh(), REFRESH_FALLBACK_MS);
    return () => {
      clearInterval(tick);
      clearInterval(fallback);
    };
  }, [router]);

  useEffect(() => {
    if (now >= opensAt) router.refresh();
  }, [now, opensAt, router]);

  const when = new Date(startsAtIso).toLocaleString("es-CL", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-[var(--space-4)] py-[var(--space-16)] text-center">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">Sala de espera</p>
      <h1 className="mt-[var(--space-3)] font-display text-3xl font-semibold text-[var(--color-primary)]">{eventTitle}</h1>
      <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">{when}</p>
      {attendeeName && <p className="mt-[var(--space-4)] text-[var(--color-text)]">Hola, {attendeeName}.</p>}
      <p className="mt-[var(--space-6)] font-display text-5xl tabular-nums text-[var(--color-primary)]" aria-hidden="true">
        {formatCountdown(opensAt - now)}
      </p>
      <p className="sr-only" aria-live="polite">
        La sala se abre en {Math.ceil(Math.max(0, opensAt - now) / 60_000)} minutos.
      </p>
      <p className="mt-[var(--space-6)] text-[var(--color-text-muted)]">
        Ya casi. La sala se abre 10 minutos antes. Te llevamos a la reunión automáticamente.
      </p>
    </main>
  );
}
```

Nota: el `sr-only` con `aria-live` cambia sólo cada minuto (el texto sólo cambia cuando cambia el número de minutos), para no saturar lectores de pantalla.

- [ ] **Step 3: Verificación**

Run: `npm run typecheck && npm run lint`
Manual (`npm run dev`): crear evento online con fecha en 2 días y un ticket gratis; abrir `/eventos/entrar/<token>` → sala de espera con cuenta regresiva; token inventado → "Este link no es válido."; editar el evento para que empiece en 5 min → el link redirige al Zoom. Detener el dev server.

- [ ] **Step 4: Commit**

```bash
git add app/eventos/entrar
git commit -m "feat(eventos): link personal con sala de espera y redirección a la reunión"
```

---

### Task 7: "Tus entradas" en la confirmación y en el panel del alumno

**Files:**
- Create: `components/events/EntryLinksList.tsx`
- Modify: `app/eventos/confirmacion/[ticketId]/page.tsx`
- Modify: `app/panel/eventos/[id]/page.tsx` (vista alumno)

**Interfaces:**
- Consumes: `ensureEventAttendees` (Task 5), `entryLinksFor`, `EntryLink` (Task 5).
- Produces: `EntryLinksList({ links: EntryLink[] })`.

- [ ] **Step 1: Componente**

```tsx
"use client";

import { toast } from "@/components/ui/Toast";
import type { EntryLink } from "@/lib/email/event";

/** Lista de links personales con botón copiar. */
export function EntryLinksList({ links }: { links: EntryLink[] }) {
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("No pudimos copiar el link. Cópialo a mano.");
    }
  }

  return (
    <section className="w-full rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] text-left">
      <h2 className="font-display text-xl font-semibold text-[var(--color-primary)]">Tus entradas</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Cada link es personal. La sala se abre 10 minutos antes del inicio.
      </p>
      <ul className="mt-[var(--space-4)] space-y-[var(--space-3)]">
        {links.map((l) => (
          <li key={l.url} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)]">{l.label}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{l.url}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(l.url)}
              className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-primary)] transition-transform active:scale-[0.97]"
            >
              Copiar link
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

(Si `toast` no está disponible fuera de los providers del panel en la página pública, verificar que `app/layout.tsx` monte el `Toaster`; `GuestCheckoutForm` ya usa `toast` en páginas públicas, así que debería estar.)

- [ ] **Step 2: Confirmación pública**

En `app/eventos/confirmacion/[ticketId]/page.tsx`, tras cargar `event`/`user`:

```ts
  const attendees = isPaid ? await ensureEventAttendees(ticket, event) : [];
  const links = attendees.length && user ? entryLinksFor(attendees, user.email) : [];
```

(`isPaid` se calcula antes; moverlo arriba si hace falta.) Renderizar, después de la `<section>` del evento:

```tsx
      {links.length > 0 && (
        <div className="mt-[var(--space-5)] w-full">
          <EntryLinksList links={links} />
        </div>
      )}
```

- [ ] **Step 3: Panel del alumno**

En `app/panel/eventos/[id]/page.tsx`, vista alumno: si `userHasTicket && event.isOnline`, calcular `const links = entryLinksFor(await ensureEventAttendees(userTicket!, event), session.user.email ?? "")` y renderizar `<EntryLinksList links={links} />` dentro del bloque `userHasTicket`, antes de "¿Vas con más personas?".

- [ ] **Step 4: Verificación**

Run: `npm run typecheck && npm run lint`
Manual: compra gratis de 2 cupos en evento online (guest) → la confirmación muestra 2 links con "Copiar link".

- [ ] **Step 5: Commit**

```bash
git add components/events/EntryLinksList.tsx app/eventos/confirmacion app/panel/eventos/[id]/page.tsx
git commit -m "feat(eventos): mostrar links personales en la confirmación y en el panel"
```

---

### Task 8: Panel admin — asistentes online y revocar

**Files:**
- Create: `app/panel/eventos/[id]/AdminOnlineAttendees.tsx`
- Modify: `app/panel/eventos/actions.ts` (acción `revokeEventAttendee`)
- Modify: `app/panel/eventos/[id]/page.tsx` (vista admin)

**Interfaces:**
- Consumes: `eventAttendeeRepository.revoke(id, centerId): Promise<boolean>` (Task 1).
- Produces: `revokeEventAttendee(attendeeId: string, eventId: string): Promise<void>`.

- [ ] **Step 1: Server action** (en `app/panel/eventos/actions.ts`)

```ts
import { eventAttendeeRepository } from "@/lib/adapters/db";

export async function revokeEventAttendee(attendeeId: string, eventId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await eventAttendeeRepository.revoke(attendeeId, centerId);
  revalidatePath(`/panel/eventos/${eventId}`);
}
```

- [ ] **Step 2: Datos en la página admin**

En `app/panel/eventos/[id]/page.tsx`, dentro de `if (isAdmin)` y sólo si `event.isOnline`:

```ts
  const onlineRows = isAdmin && event.isOnline
    ? (
        await prisma.eventAttendee.findMany({
          where: { ticket: { eventId: id, status: "PAID" } },
          select: {
            id: true, seat: true, name: true, email: true, firstEnteredAt: true, revokedAt: true,
            ticket: { select: { user: { select: { name: true, email: true } } } },
          },
          orderBy: [{ ticket: { paidAt: "asc" } }, { seat: "asc" }],
        })
      ).map((a) => ({
        id: a.id,
        seat: a.seat,
        buyer: a.ticket.user.name ?? a.ticket.user.email,
        attendee: a.seat === 1 ? (a.ticket.user.name ?? a.ticket.user.email) : (a.name ?? a.email),
        enteredAt: a.firstEnteredAt
          ? a.firstEnteredAt.toLocaleTimeString("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit" })
          : null,
        revoked: !!a.revokedAt,
      }))
    : [];
```

Renderizar después de la sección "Asistentes": `{event.isOnline && <AdminOnlineAttendees eventId={id} rows={onlineRows} />}`.

Mostrar también en el `viewContent` del evento una línea `{event.isOnline && <p>Online: {event.meetingUrl}</p>}` (sólo admin).

- [ ] **Step 3: Componente**

```tsx
"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { revokeEventAttendee } from "@/app/panel/eventos/actions";

type Row = {
  id: string;
  seat: number;
  buyer: string;
  attendee: string | null;
  enteredAt: string | null;
  revoked: boolean;
};

export function AdminOnlineAttendees({ eventId, rows }: { eventId: string; rows: Row[] }) {
  const [target, setTarget] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    if (!target) return;
    const id = target.id;
    setTarget(null);
    startTransition(() => revokeEventAttendee(id, eventId));
  }

  return (
    <section className="mb-8">
      <ConfirmDialog
        open={!!target}
        onConfirm={confirm}
        onCancel={() => setTarget(null)}
        title="¿Revocar este link?"
        description="La persona ya no podrá entrar con este link. No se puede deshacer."
        confirmLabel="Revocar link"
        loading={isPending}
      />
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Asistentes online</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Aún no hay entradas confirmadas.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {r.attendee ?? `Entrada ${r.seat} de ${r.buyer}`}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Compró {r.buyer} · Entrada {r.seat}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {r.revoked ? "Revocado" : r.enteredAt ? `Entró a las ${r.enteredAt}` : "No ha entrado"}
                </span>
                {!r.revoked && (
                  <button type="button" onClick={() => setTarget(r)} className="min-h-[44px] text-sm font-medium text-[var(--color-error)] underline underline-offset-2">
                    Revocar link
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Verificación**

Run: `npm run typecheck && npm run lint`
Manual: en el evento online con tickets, ver la tabla; revocar uno → "Revocado" y su link muestra "no es válido".

- [ ] **Step 5: Commit**

```bash
git add app/panel/eventos
git commit -m "feat(eventos): asistentes online en el panel con opción de revocar link"
```

---

### Task 9: Recordatorio ~2 h antes en el cron existente

**Files:**
- Create: `lib/application/send-event-online-reminders.ts`, `lib/application/send-event-online-reminders.test.ts`
- Modify: `app/api/cron/class-reminder/route.ts`

**Interfaces:**
- Consumes: `buildEventOnlineReminderEmail`, `entryLinksFor` (Task 5); `sendEmailSafe`, `shouldSendEmail`, `getEmailBranding` (existentes).
- Produces: `groupReminderRecipients(rows): ReminderGroup[]` (pura) y `sendEventOnlineReminders(now: Date): Promise<{ sent: number }>`.

- [ ] **Step 1: Test de agrupación que falla** (lógica pura: quién recibe qué)

```ts
import { describe, it, expect } from "vitest";
import { groupReminderRecipients } from "./send-event-online-reminders";

const buyer = { id: "u1", email: "yo@correo.cl", name: "Jorge" };
const row = (seat: number, email: string | null) => ({
  id: `a${seat}`, ticketId: "t1", seat, token: `tok${seat}`, name: null, email,
  firstEnteredAt: null, lastEnteredAt: null, revokedAt: null, buyer, eventId: "e1",
});

describe("groupReminderRecipients", () => {
  it("cupos sin correo (o con el del comprador) → un solo correo al comprador con todos", () => {
    const groups = groupReminderRecipients([row(1, null), row(2, null), row(3, "yo@correo.cl")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ toEmail: "yo@correo.cl", isBuyer: true, userId: "u1" });
    expect(groups[0].attendees.map((a) => a.seat)).toEqual([1, 2, 3]);
  });

  it("asistente con correo propio → su propio correo con sólo su link", () => {
    const groups = groupReminderRecipients([row(1, null), row(2, "ana@correo.cl")]);
    expect(groups).toHaveLength(2);
    const ana = groups.find((g) => g.toEmail === "ana@correo.cl")!;
    expect(ana.isBuyer).toBe(false);
    expect(ana.attendees.map((a) => a.seat)).toEqual([2]);
  });
});
```

Run: `npx vitest run lib/application/send-event-online-reminders.test.ts` → FAIL.

- [ ] **Step 2: Implementar**

```ts
/**
 * Recordatorio ~2 h antes de cada evento online, colgado del cron
 * class-reminder (Vercel Hobby no admite más crons). Dedupe con
 * EventAttendee.reminderSentAt y claim atómico, igual que las reservas.
 */
import { prisma } from "@/lib/adapters/db/prisma";
import type { EventAttendee } from "@/lib/domain/event";
import { sendEmailSafe } from "./send-email";
import { shouldSendEmail } from "./check-email-preference";
import { getEmailBranding } from "@/lib/email/branding";
import { buildEventOnlineReminderEmail, entryLinksFor } from "@/lib/email/event";

type Buyer = { id: string; email: string; name: string | null };
export type ReminderRow = EventAttendee & { buyer: Buyer; eventId: string };
export type ReminderGroup = { toEmail: string; userName: string | null; isBuyer: boolean; userId: string; eventId: string; attendees: EventAttendee[] };

/** Un correo por destinatario: el comprador recibe los cupos sin correo propio; cada asistente con correo, el suyo. */
export function groupReminderRecipients(rows: ReminderRow[]): ReminderGroup[] {
  const groups = new Map<string, ReminderGroup>();
  for (const r of rows) {
    const own = r.email && r.email !== r.buyer.email ? r.email : null;
    const key = `${r.eventId}:${own ?? r.buyer.email}`;
    const g = groups.get(key) ?? {
      toEmail: own ?? r.buyer.email,
      userName: own ? r.name : r.buyer.name,
      isBuyer: !own,
      userId: r.buyer.id,
      eventId: r.eventId,
      attendees: [],
    };
    g.attendees.push(r);
    groups.set(key, g);
  }
  return [...groups.values()];
}

export async function sendEventOnlineReminders(now: Date): Promise<{ sent: number }> {
  const from = new Date(now.getTime() + 60 * 60 * 1000);
  const to = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const candidates = await prisma.eventAttendee.findMany({
    where: {
      reminderSentAt: null,
      revokedAt: null,
      ticket: { status: "PAID", event: { isOnline: true, status: "PUBLISHED", startsAt: { gte: from, lte: to } } },
    },
    include: { ticket: { include: { user: { select: { id: true, email: true, name: true } }, event: true } } },
  });
  if (candidates.length === 0) return { sent: 0 };

  // Claim atómico: sólo nos quedamos con los que este disparo logró marcar.
  const claimed = await prisma.eventAttendee.updateManyAndReturn({
    where: { id: { in: candidates.map((c) => c.id) }, reminderSentAt: null },
    data: { reminderSentAt: now },
    select: { id: true },
  });
  const claimedIds = new Set(claimed.map((c) => c.id));
  const rows = candidates
    .filter((c) => claimedIds.has(c.id))
    .map((c) => ({ ...c, buyer: c.ticket.user, eventId: c.ticket.eventId }));

  const events = new Map(candidates.map((c) => [c.ticket.eventId, c.ticket.event]));
  let sent = 0;
  for (const g of groupReminderRecipients(rows)) {
    const event = events.get(g.eventId)!;
    if (g.isBuyer && !(await shouldSendEmail(g.userId, event.centerId, "classReminder"))) continue;
    const branding = await getEmailBranding(event.centerId);
    sendEmailSafe(
      buildEventOnlineReminderEmail({
        toEmail: g.toEmail,
        userName: g.userName,
        eventTitle: event.title,
        startsAt: event.startsAt,
        entryLinks: entryLinksFor(g.attendees, g.isBuyer ? g.toEmail : ""),
        branding,
      })
    );
    sent++;
  }
  return { sent };
}
```

(`updateManyAndReturn` existe en Prisma ≥ 6.2 para Postgres; el repo usa Prisma 7. Si el typecheck lo rechaza, reemplazar por un `updateMany` por id como en el loop de reservas.)

Run: `npx vitest run lib/application/send-event-online-reminders.test.ts` → PASS.

- [ ] **Step 3: Colgarlo del cron**

En `app/api/cron/class-reminder/route.ts`, antes del `return NextResponse.json(...)`:

```ts
  const events = await sendEventOnlineReminders(now).catch((err) => {
    console.error("[class-reminder] event reminders", err instanceof Error ? err.message : err);
    return { sent: 0 };
  });
```

y agregar `eventRemindersSent: events.sent,` al JSON de respuesta. Import: `import { sendEventOnlineReminders } from "@/lib/application/send-event-online-reminders";`. Actualizar el JSDoc del handler con una línea: "También envía el recordatorio de eventos online (ver send-event-online-reminders)".

- [ ] **Step 4: Verificación**

Run: `npm run typecheck && npx vitest run lib/application`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/application/send-event-online-reminders.ts lib/application/send-event-online-reminders.test.ts app/api/cron/class-reminder/route.ts
git commit -m "feat(eventos): recordatorio de eventos online con los links personales"
```

---

### Task 10: E2E del flujo completo

**Files:**
- Modify: `e2e/helpers/cleanup.ts` (`seedEvent` acepta `isOnline`/`meetingUrl`)
- Create: `e2e/eventos-online.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Helper**

En `seedEvent(opts)` agregar `isOnline?: boolean; meetingUrl?: string | null;` al tipo y `isOnline: opts.isOnline ?? false, meetingUrl: opts.meetingUrl ?? null,` al `data` del `prisma.event.create`. Agregar helper:

```ts
export async function setEventTimes(eventId: string, startsAt: Date, endsAt: Date): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;
  await prisma.event.update({ where: { id: eventId }, data: { startsAt, endsAt } });
}
```

- [ ] **Step 2: Spec**

```ts
import { test, expect } from "@playwright/test";
import { seedEvent, setEventTimes, cleanupEvents, cleanupEventTickets, cleanupTier1UsersByEmailPrefix } from "./helpers/cleanup";

/**
 * Evento online: compra guest de 2 cupos con un asistente → la confirmación
 * muestra 2 links → antes de hora, sala de espera → en la ventana, redirige
 * a la reunión → revocado, "no es válido".
 */
test.describe("Eventos online — link personal", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  const runId = Date.now().toString(36);
  const emailPrefix = "online-evt-e2e-";
  const title = `E2E Evento Online ${runId}`;
  const meetingUrl = "https://zoom.us/j/123456789";
  let event: { id: string; title: string } | null = null;
  let links: string[] = [];

  test.beforeAll(async () => {
    event = await seedEvent({ centerSlug: "e2e-test", title, amountCents: 0, isOnline: true, meetingUrl });
  });

  test.afterAll(async () => {
    if (event) await cleanupEventTickets(event.id);
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
    await cleanupEvents(title);
  });

  test("compra con asistente → 2 links en la confirmación", async ({ page }) => {
    test.skip(!event, "Seed no disponible");
    await page.goto(`/eventos/${event!.id}`);
    await page.getByRole("button", { name: /^Reservar entrada$/i }).click();
    await page.getByRole("button", { name: /aumentar|más|\+/i }).first().click(); // QuantityStepper → 2
    await page.getByLabel(/Nombre completo/i).fill("Comprador Online");
    await page.getByLabel(/^Email$/i).fill(`${emailPrefix}${runId}@e2e.test`);
    await page.getByLabel(/Teléfono/i).fill("+56 9 1234 5678");
    await page.getByLabel(/Entrada 2 · nombre/i).fill("Ana");
    await page.getByRole("button", { name: /Confirmar reserva/i }).click();

    await page.waitForURL(/\/eventos\/confirmacion\//, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Tus entradas" })).toBeVisible();
    await expect(page.getByText(/Entrada 2 · Ana/)).toBeVisible();
    links = await page.locator("text=/\\/eventos\\/entrar\\//").allTextContents();
    expect(links).toHaveLength(2);
  });

  test("antes de hora → sala de espera", async ({ page }) => {
    test.skip(links.length === 0, "Sin links");
    await page.goto(new URL(links[0]).pathname);
    await expect(page.getByText(/Sala de espera/i)).toBeVisible();
    await expect(page.getByText(/La sala se abre 10 minutos antes/i)).toBeVisible();
  });

  test("en la ventana → redirige a la reunión", async ({ request }) => {
    test.skip(links.length === 0, "Sin links");
    const now = Date.now();
    await setEventTimes(event!.id, new Date(now + 5 * 60_000), new Date(now + 65 * 60_000));
    const res = await request.get(new URL(links[0]).pathname, { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toBe(meetingUrl);
  });

  test("token inválido → no es válido", async ({ page }) => {
    await page.goto("/eventos/entrar/token-que-no-existe");
    await expect(page.getByRole("heading", { name: /Este link no es válido/i })).toBeVisible();
  });
});
```

La revocación desde el panel admin se cubre con la verificación manual de la Task 8 (requiere sesión admin y el `storageState` admin del proyecto; si `e2e/panel-eventos-admin.spec.ts` ya tiene ese setup, agregar ahí un test: entrar al evento online, click "Revocar link", confirmar, ver "Revocado").

Ajustar el selector del stepper al `ariaLabel`/botones reales de `components/ui/QuantityStepper.tsx` (leerlo antes).

- [ ] **Step 3: Correr el spec**

Run: `npx playwright test e2e/eventos-online.spec.ts`
Expected: 4 passed.

- [ ] **Step 4: Suite completa**

Run: `npm run typecheck && npm run lint && npm run test && npm run e2e`
Expected: todo verde (si fallan specs ajenos por latencia de la DB remota, reintentar ese spec puntual antes de concluir).

- [ ] **Step 5: Commit**

```bash
git add e2e/helpers/cleanup.ts e2e/eventos-online.spec.ts
git commit -m "test(eventos): e2e del link personal de eventos online"
```
