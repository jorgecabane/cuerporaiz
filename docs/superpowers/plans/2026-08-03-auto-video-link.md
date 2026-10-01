# Auto-generación y sincronización del link de video — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el link de Zoom/Meet se genere automáticamente al crear/editar clases online, y que al cambiar nombre/hora la reunión se actualice por debajo manteniendo el mismo link.

**Architecture:** Hexagonal. Se persiste el `provider` + `externalId` de la reunión en `LiveClass`/`LiveClassSeries`. Las funciones de aplicación crean/actualizan/borran reuniones vía las APIs de Zoom (`/v2/.../meetings`) y Google Calendar (`/calendar/v3/...`). Los formularios auto-generan en vivo cuando hay un solo proveedor y los campos requeridos están completos.

**Tech Stack:** Next.js 16 (App Router, server actions), Prisma 7 (PostgreSQL/Supabase), React 19, Vitest, Playwright.

## Global Constraints

- **Copy en español chileno con tú**, masculino genérico. Código en inglés.
- **No romper la propagación existente**: `generateSeriesInstances` copia `isOnline`+`meetingUrl` a cada instancia (verificado 8/8). Los nuevos campos deben propagarse igual.
- **Nunca llamar a las APIs reales de Zoom/Meet en tests** — mockear con `vi.spyOn`/`vi.mock` (unit) y interceptar red (E2E). Cobertura 90% en `lib/`.
- **Nunca `git commit --amend`.** Un commit por deliverable.
- **Legacy-safe**: filas con `meetingUrl` pero sin `meetingExternalId` no se PATCHean; se conserva el link tal cual.
- **best-effort delete**: borrar la reunión en el proveedor no debe bloquear ni lanzar si falla; solo `console.error`.

## File Structure

- `prisma/schema.prisma` — agregar 2 campos a `LiveClass` y `LiveClassSeries` (+ migración).
- `lib/domain/live-class.ts`, `lib/domain/live-class-series.ts` — campos en las entidades.
- `lib/ports/live-class-repository.ts`, `lib/ports/live-class-series-repository.ts` — campos en los inputs.
- `lib/adapters/db/live-class-repository.ts`, `lib/adapters/db/live-class-series-repository.ts` — mapeo persistencia.
- `lib/application/generate-series-instances.ts` — propagar los 2 campos.
- `lib/application/create-zoom-meeting.ts`, `create-google-meet-meeting.ts` — devolver `externalId`, soporte recurring.
- `lib/application/update-zoom-meeting.ts`, `update-google-meet-meeting.ts` (nuevos) — PATCH + delete.
- `app/panel/horarios/actions.ts` — server actions: devolver/persistir provider+externalId, PATCH al editar, delete best-effort.
- `app/panel/horarios/nueva/CreateClassForm.tsx`, `app/panel/horarios/[id]/EditClassForm.tsx` — auto-generar + guarda.

---

### Task 1: Migración + tipos (provider + externalId)

**Files:**
- Modify: `prisma/schema.prisma` (models `LiveClass` ~137-181, `LiveClassSeries`)
- Create: `prisma/migrations/<timestamp>_add_meeting_provider_external_id/migration.sql`
- Modify: `lib/domain/live-class.ts:10-25`, `lib/domain/live-class-series.ts:7-20`
- Modify: `lib/ports/live-class-repository.ts` (`CreateLiveClassInput`, `UpdateLiveClassInput`)
- Modify: `lib/ports/live-class-series-repository.ts` (`CreateSeriesInput`, `UpdateSeriesInput`)
- Modify: `lib/adapters/db/live-class-repository.ts` (`toDomain`, `create`, `update`, `updateManyBySeriesId`, `updateManyByIds`, `createMany`)
- Modify: `lib/adapters/db/live-class-series-repository.ts` (`toDomain`, `create`, `update`)
- Modify: `lib/application/generate-series-instances.ts:54-68` (`makeInput`)
- Test: `lib/application/generate-series-instances.test.ts`

**Interfaces:**
- Produces: en todas las entidades/inputs, dos campos opcionales:
  `meetingProvider?: string | null` ("zoom" | "meet"), `meetingExternalId?: string | null`.

- [ ] **Step 1: Escribir test que falla** — en `generate-series-instances.test.ts`, agregar un test que verifique propagación de los nuevos campos:

```ts
it("propaga meetingProvider y meetingExternalId a cada instancia", () => {
  const series = {
    ...baseSeries, // helper existente del archivo; si no existe, construir un LiveClassSeries WEEKLY
    isOnline: true,
    meetingUrl: "https://zoom.us/j/123",
    meetingProvider: "zoom",
    meetingExternalId: "999888777",
  } as LiveClassSeries;
  const instances = generateSeriesInstances(series, undefined, "America/Santiago");
  expect(instances.length).toBeGreaterThan(0);
  expect(instances.every((i) => i.meetingProvider === "zoom")).toBe(true);
  expect(instances.every((i) => i.meetingExternalId === "999888777")).toBe(true);
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run lib/application/generate-series-instances.test.ts`
Expected: FAIL (TS: `meetingProvider` no existe en `LiveClassSeries` / `CreateLiveClassInput`).

- [ ] **Step 3: Agregar campos al schema Prisma**

En `prisma/schema.prisma`, dentro de `model LiveClass` (junto a `meetingUrl String?`):

```prisma
  meetingUrl         String?
  meetingProvider    String?  // "zoom" | "meet"
  meetingExternalId  String?  // Zoom meetingId | Google eventId
```

Lo mismo en `model LiveClassSeries` (junto a su `meetingUrl String?`).

- [ ] **Step 4: Generar la migración**

Run: `npx prisma migrate dev --name add_meeting_provider_external_id`
Expected: crea la migración y regenera el client. Verificar que el SQL solo hace `ALTER TABLE ... ADD COLUMN` (nullable, sin default) para las 2 tablas.

- [ ] **Step 5: Agregar campos a dominio, ports y adapters**

En `lib/domain/live-class.ts` (interface `LiveClass`) y `lib/domain/live-class-series.ts` (interface `LiveClassSeries`), junto a `meetingUrl: string | null;`:

```ts
  meetingProvider: string | null;
  meetingExternalId: string | null;
```

En `lib/ports/live-class-repository.ts` (`CreateLiveClassInput` y `UpdateLiveClassInput`) y `lib/ports/live-class-series-repository.ts` (`CreateSeriesInput` y `UpdateSeriesInput`), junto a `meetingUrl?: string | null;`:

```ts
  meetingProvider?: string | null;
  meetingExternalId?: string | null;
```

En `lib/adapters/db/live-class-repository.ts`:
- `toDomain`: agregar `meetingProvider: c.meetingProvider,` y `meetingExternalId: c.meetingExternalId,`.
- `create` / `createMany`: incluir `meetingProvider: data.meetingProvider ?? null,` y `meetingExternalId: data.meetingExternalId ?? null,`.
- `update`, `updateManyBySeriesId`, `updateManyByIds`: agregar los spreads condicionales:

```ts
          ...(data.meetingProvider !== undefined && { meetingProvider: data.meetingProvider }),
          ...(data.meetingExternalId !== undefined && { meetingExternalId: data.meetingExternalId }),
```

En `lib/adapters/db/live-class-series-repository.ts`: análogo en `toDomain`, `create` (con `?? null`) y `update` (spread condicional).

En `lib/application/generate-series-instances.ts`, dentro de `makeInput` (línea ~62-63), agregar:

```ts
      meetingProvider: series.meetingProvider,
      meetingExternalId: series.meetingExternalId,
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npx vitest run lib/application/generate-series-instances.test.ts && npx tsc --noEmit`
Expected: PASS + typecheck limpio.

- [ ] **Step 7: Commit**

```bash
git add prisma lib/domain lib/ports lib/adapters lib/application/generate-series-instances.ts lib/application/generate-series-instances.test.ts
git commit -m "feat(video): persiste meetingProvider y meetingExternalId en clase y serie"
```

---

### Task 2: create-meeting devuelve externalId + soporte recurring

**Files:**
- Modify: `lib/application/create-zoom-meeting.ts`
- Modify: `lib/application/create-google-meet-meeting.ts`
- Modify: `app/panel/horarios/actions.ts` (`createMeetingForClass` ~44-67)
- Test: `lib/application/create-zoom-meeting.test.ts` (crear), `lib/application/create-google-meet-meeting.test.ts` (crear)

**Interfaces:**
- Consumes: nada nuevo.
- Produces:
  - `CreateZoomMeetingResult = { joinUrl: string; externalId: string }`
  - `CreateGoogleMeetMeetingResult = { joinUrl: string; externalId: string }`
  - `CreateZoomMeetingParams` gana `recurring?: boolean`.
  - `createMeetingForClass(provider, params & { recurring?: boolean })` devuelve `{ joinUrl: string; externalId: string; provider: "zoom" | "meet" }`.

- [ ] **Step 1: Test que falla (Zoom)** — en `lib/application/create-zoom-meeting.test.ts` (crear si no existe), mockear `zoomConfigRepository` y `fetch`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({
  zoomConfigRepository: {
    findByCenterId: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { zoomConfigRepository } from "@/lib/adapters/db";
import { createZoomMeeting } from "./create-zoom-meeting";

describe("createZoomMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("devuelve joinUrl y externalId (id de la reunión)", async () => {
    (zoomConfigRepository.findByCenterId as any).mockResolvedValue({
      accessToken: "tok", refreshToken: "r", tokenExpiresAt: new Date(Date.now() + 3600_000),
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 8231409562, join_url: "https://zoom.us/j/8231409562" }),
    }) as any;

    const res = await createZoomMeeting("center-1", {
      title: "Yoga", startTime: new Date("2026-08-04T12:30:00Z"), durationMinutes: 60,
    });
    expect(res.joinUrl).toBe("https://zoom.us/j/8231409562");
    expect(res.externalId).toBe("8231409562");
  });

  it("usa type 3 cuando recurring=true", async () => {
    (zoomConfigRepository.findByCenterId as any).mockResolvedValue({
      accessToken: "tok", tokenExpiresAt: new Date(Date.now() + 3600_000),
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1, join_url: "u" }) });
    global.fetch = fetchMock as any;
    await createZoomMeeting("c", { title: "T", startTime: new Date(), durationMinutes: 60, recurring: true });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.type).toBe(3);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run lib/application/create-zoom-meeting.test.ts`
Expected: FAIL (`externalId` undefined; `type` siempre 2).

- [ ] **Step 3: Implementar en `create-zoom-meeting.ts`**

Cambiar la interface de resultado y params:

```ts
export interface CreateZoomMeetingParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
  recurring?: boolean;
}

export interface CreateZoomMeetingResult {
  joinUrl: string;
  externalId: string;
}
```

En el body del `fetch`, elegir tipo según `recurring`:

```ts
    body: JSON.stringify(
      params.recurring
        ? { topic: params.title, type: 3, timezone }
        : {
            topic: params.title,
            type: 2,
            start_time: startTimeISO,
            duration: params.durationMinutes,
            timezone,
          }
    ),
```

Y al parsear la respuesta:

```ts
  const data = (await res.json()) as { id?: number | string; join_url?: string };
  if (!data.join_url || data.id == null) {
    throw new Error("Zoom no devolvió el link o el id de la reunión.");
  }
  return { joinUrl: data.join_url, externalId: String(data.id) };
```

- [ ] **Step 4: Test que falla (Google)** — en `lib/application/create-google-meet-meeting.test.ts` (crear), análogo: mock `googleMeetConfigRepository` + `fetch` que devuelve `{ id: "evt_123", hangoutLink: "https://meet.google.com/abc" }`; esperar `res.externalId === "evt_123"`.

- [ ] **Step 5: Implementar en `create-google-meet-meeting.ts`**

```ts
export interface CreateGoogleMeetMeetingResult {
  joinUrl: string;
  externalId: string;
}
```

Al parsear:

```ts
  const data = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ uri?: string }> };
  };
  const joinUrl = data.hangoutLink ?? data.conferenceData?.entryPoints?.[0]?.uri;
  if (!joinUrl || !data.id) {
    throw new Error("Google Meet no devolvió el link o el id del evento.");
  }
  return { joinUrl, externalId: data.id };
```

- [ ] **Step 6: Actualizar `createMeetingForClass` en `actions.ts`**

```ts
export async function createMeetingForClass(
  provider: "zoom" | "meet",
  params: { title: string; startTime: string; durationMinutes: number; recurring?: boolean }
): Promise<{ joinUrl: string; externalId: string; provider: "zoom" | "meet" }> {
  const centerId = await requireAdminCenterId();
  const startTime = new Date(params.startTime);
  if (provider === "zoom") {
    const r = await createZoomMeeting(centerId, {
      title: params.title, startTime, durationMinutes: params.durationMinutes, recurring: params.recurring,
    });
    return { joinUrl: r.joinUrl, externalId: r.externalId, provider };
  }
  const r = await createGoogleMeetMeeting(centerId, {
    title: params.title, startTime, durationMinutes: params.durationMinutes,
  });
  return { joinUrl: r.joinUrl, externalId: r.externalId, provider };
}
```

- [ ] **Step 7: Correr tests + typecheck**

Run: `npx vitest run lib/application/create-zoom-meeting.test.ts lib/application/create-google-meet-meeting.test.ts && npx tsc --noEmit`
Expected: PASS + limpio.

- [ ] **Step 8: Commit**

```bash
git add lib/application/create-zoom-meeting.ts lib/application/create-google-meet-meeting.ts lib/application/create-zoom-meeting.test.ts lib/application/create-google-meet-meeting.test.ts app/panel/horarios/actions.ts
git commit -m "feat(video): create-meeting devuelve externalId y soporta recurring (Zoom type 3)"
```

---

### Task 3: Funciones update + delete de reunión

**Files:**
- Create: `lib/application/update-zoom-meeting.ts`, `lib/application/update-google-meet-meeting.ts`
- Test: `lib/application/update-zoom-meeting.test.ts`, `lib/application/update-google-meet-meeting.test.ts`
- Modify: `app/panel/horarios/actions.ts` (nueva `updateMeetingForClass`, `deleteMeetingForClass`)

**Interfaces:**
- Consumes: `zoomConfigRepository` / `googleMeetConfigRepository` (mismo patrón de refresh de token que las funciones create).
- Produces:
  - `updateZoomMeeting(centerId, meetingId, params: { title?; startTime?; durationMinutes?; timezone? }): Promise<void>`
  - `updateGoogleMeetMeeting(centerId, eventId, params: { title?; startTime?; durationMinutes?; timezone? }): Promise<void>`
  - `deleteZoomMeeting(centerId, meetingId): Promise<void>` / `deleteGoogleMeetMeeting(centerId, eventId): Promise<void>` (best-effort: capturan y loguean, no lanzan).
  - `updateMeetingForClass(provider, externalId, params)` / `deleteMeetingForClass(provider, externalId)` en `actions.ts`.

- [ ] **Step 1: Test que falla (update Zoom)** — verificar que hace `PATCH https://api.zoom.us/v2/meetings/{id}` con el topic:

```ts
it("hace PATCH al meeting con el nuevo topic", async () => {
  (zoomConfigRepository.findByCenterId as any).mockResolvedValue({ accessToken: "tok", tokenExpiresAt: new Date(Date.now()+3600_000) });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
  global.fetch = fetchMock as any;
  await updateZoomMeeting("c", "555", { title: "Nuevo" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.zoom.us/v2/meetings/555");
  expect((init as any).method).toBe("PATCH");
  expect(JSON.parse((init as any).body).topic).toBe("Nuevo");
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run lib/application/update-zoom-meeting.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `update-zoom-meeting.ts`** — reutilizar el patrón de refresh de token de `create-zoom-meeting.ts` (extraer `getValidZoomAccessToken(centerId)` a un helper compartido o replicar). PATCH:

```ts
export interface UpdateZoomMeetingParams {
  title?: string;
  startTime?: Date;
  durationMinutes?: number;
  timezone?: string;
}

export async function updateZoomMeeting(centerId: string, meetingId: string, params: UpdateZoomMeetingParams): Promise<void> {
  const accessToken = await getValidZoomAccessToken(centerId); // helper con el mismo refresh que create
  const body: Record<string, unknown> = {};
  if (params.title !== undefined) body.topic = params.title;
  if (params.startTime !== undefined) body.start_time = params.startTime.toISOString().replace(/\.\d{3}Z$/, "Z");
  if (params.durationMinutes !== undefined) body.duration = params.durationMinutes;
  if (params.timezone !== undefined) body.timezone = params.timezone;
  if (Object.keys(body).length === 0) return;
  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Zoom update meeting failed:", res.status, text);
    throw new Error("No se pudo actualizar la reunión en Zoom.");
  }
}

export async function deleteZoomMeeting(centerId: string, meetingId: string): Promise<void> {
  try {
    const accessToken = await getValidZoomAccessToken(centerId);
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error("Zoom delete meeting (best-effort) failed:", err);
  }
}
```

Nota: extraer `getValidZoomAccessToken` de `create-zoom-meeting.ts` (mover la lógica de refresh a un helper exportado y consumirlo desde ambos archivos) para no duplicar. Ajustar `create-zoom-meeting.ts` para usar el helper.

- [ ] **Step 4: Test + implementar `update-google-meet-meeting.ts`** — análogo con
  `PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}?conferenceDataVersion=1`,
  body `{ summary?, start?: { dateTime, timeZone }, end?: {...} }`. `deleteGoogleMeetMeeting` → `DELETE .../events/{eventId}` best-effort. Extraer `getValidGoogleAccessToken` igual que en Zoom.

- [ ] **Step 5: Agregar `updateMeetingForClass` y `deleteMeetingForClass` en `actions.ts`**

```ts
export async function updateMeetingForClass(
  provider: "zoom" | "meet",
  externalId: string,
  params: { title?: string; startTime?: string; durationMinutes?: number }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  const startTime = params.startTime ? new Date(params.startTime) : undefined;
  if (provider === "zoom") {
    await updateZoomMeeting(centerId, externalId, { title: params.title, startTime, durationMinutes: params.durationMinutes });
  } else {
    await updateGoogleMeetMeeting(centerId, externalId, { title: params.title, startTime, durationMinutes: params.durationMinutes });
  }
}

export async function deleteMeetingForClass(provider: "zoom" | "meet", externalId: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  if (provider === "zoom") await deleteZoomMeeting(centerId, externalId);
  else await deleteGoogleMeetMeeting(centerId, externalId);
}
```

- [ ] **Step 6: Correr tests + typecheck**

Run: `npx vitest run lib/application/update-zoom-meeting.test.ts lib/application/update-google-meet-meeting.test.ts lib/application/create-zoom-meeting.test.ts && npx tsc --noEmit`
Expected: PASS (incluye los tests de create que usan el helper extraído).

- [ ] **Step 7: Commit**

```bash
git add lib/application/update-zoom-meeting.ts lib/application/update-google-meet-meeting.ts lib/application/create-zoom-meeting.ts lib/application/create-google-meet-meeting.ts lib/application/*update*.test.ts app/panel/horarios/actions.ts
git commit -m "feat(video): funciones update (PATCH) y delete best-effort de reunión Zoom/Meet"
```

---

### Task 4: Persistir provider+externalId y sincronizar en las server actions

**Files:**
- Modify: `app/panel/horarios/actions.ts` (`CreateClassFormData`, `createLiveClass`, `UpdateClassFormData`, `updateLiveClass`, `EditSeriesFormData`, `updateSeriesClasses`)
- Test: `app/panel/horarios/actions.test.ts` (crear si no existe; mockear repos + funciones de meeting)

**Interfaces:**
- Consumes: `updateMeetingForClass`, `deleteMeetingForClass` (Task 3); persistencia de campos (Task 1).
- Produces: los payloads de crear/editar aceptan `meetingProvider?: string | null` y `meetingExternalId?: string | null`; se persisten y se dispara PATCH/delete según reglas.

- [ ] **Step 1: Test que falla** — al editar una clase única online cuyo `meetingExternalId` existe y cambia el título, se llama `updateMeetingForClass("zoom", "555", { title: "Nuevo", ... })`. Y al desmarcar online (meetingUrl→null) sobre una clase con externalId, se llama `deleteMeetingForClass`. Mockear el módulo de meeting actions.

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run app/panel/horarios/actions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Agregar los campos a los payloads** — en `CreateClassFormData`, `UpdateClassFormData` y `EditSeriesFormData` agregar `meetingProvider: string | null;` y `meetingExternalId: string | null;`. Incluirlos en los objetos que se pasan a `liveClassRepository.create/update` y `liveClassSeriesRepository.create/update` y en el `classUpdate` de `updateSeriesClasses`.

- [ ] **Step 4: PATCH "por debajo" en `updateLiveClass`** — antes de persistir, si `existing.meetingExternalId` y `existing.meetingProvider` existen y sigue online:
  - si cambió `title` o `startsAt` o `durationMinutes` → `await updateMeetingForClass(provider, externalId, { title, startTime, durationMinutes })` (envuelto en try/catch que, si falla, corta con error claro y NO guarda — coherente con "no guardar online sin link válido"). Conservar `meetingProvider`/`meetingExternalId` sin cambio.
  - si se **desmarcó** online (`meetingUrl` pasa a null) → `await deleteMeetingForClass(...)` best-effort y limpiar `meetingProvider`/`meetingExternalId` a null.

- [ ] **Step 5: Sincronización en `updateSeriesClasses`** — para scope `all`/`thisAndFollowing`, si la serie ya tiene `meetingExternalId` y cambió el título → un solo PATCH del topic/summary (el link es compartido; la hora no afecta el link en series). Para scope `this` (desacople), NO PATCH la reunión compartida: la instancia desacoplada conserva el link heredado pero se limpia su `meetingExternalId` (queda como legacy suelta) — su propia reunión independiente se generará desde el formulario en Task 6. Documentar este comportamiento con comentario.

- [ ] **Step 6: Correr tests + typecheck**

Run: `npx vitest run app/panel/horarios/actions.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/panel/horarios/actions.ts app/panel/horarios/actions.test.ts
git commit -m "feat(video): persiste provider+externalId y sincroniza reunión al editar clase/serie"
```

---

### Task 5: Auto-generar en el formulario de crear

**Files:**
- Modify: `app/panel/horarios/nueva/CreateClassForm.tsx`
- Test: (E2E) `e2e/horarios-online.spec.ts` (crear; mockear las rutas de red de Zoom/Meet o el server action vía interceptación)

**Interfaces:**
- Consumes: `createMeetingForClass` que ahora devuelve `{ joinUrl, externalId, provider }`.

- [ ] **Step 1: Estado para provider+externalId** — agregar `const [meetingProvider, setMeetingProvider] = useState<string | null>(null);` y `const [meetingExternalId, setMeetingExternalId] = useState<string | null>(null);`. En `handleGenerateMeeting`, tras el `createMeetingForClass`, guardar `setMeetingProvider(res.provider); setMeetingExternalId(res.externalId);`. Pasar `recurring: recurrence.repeat !== "none"` al llamar.

- [ ] **Step 2: Auto-generar al completar campos** — cuando `isOnline`, hay **exactamente un** proveedor (`videoProviders.zoom !== videoProviders.meet`), y `title` + `startsAt` están completos, disparar `handleGenerateMeeting(theSingleProvider)` con debounce (~600ms) vía `useEffect` sobre `[isOnline, title, startsAt, durationMinutes]`. Si ya hay `meetingExternalId` y solo cambió la hora, llamar `updateMeetingForClass` en vez de crear (evita fantasma). Si faltan campos, no generar y mostrar el botón deshabilitado con aviso "Completa nombre y fecha/hora para generar el link".

- [ ] **Step 3: Persistir en submit** — en `handleSubmit`/`createLiveClass`, pasar `meetingProvider` y `meetingExternalId`.

- [ ] **Step 4: E2E** — crear una clase online (un solo proveedor conectado en el fixture), interceptar la llamada de creación de reunión para devolver `{ joinUrl, externalId, provider }` mockeado, y verificar que el link aparece sin apretar botón. Usar `page.route` para interceptar la API del proveedor.

Run: `E2E_PORT=3001 npx playwright test e2e/horarios-online.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/panel/horarios/nueva/CreateClassForm.tsx e2e/horarios-online.spec.ts
git commit -m "feat(video): auto-genera link al crear clase online con un solo proveedor"
```

---

### Task 6: Auto-generar + guarda en el formulario de editar

**Files:**
- Modify: `app/panel/horarios/[id]/EditClassForm.tsx`
- Modify: `app/panel/horarios/[id]/page.tsx` (pasar `meetingProvider`/`meetingExternalId` iniciales si hace falta — vienen en `liveClass`)
- Test: (E2E) extender `e2e/horarios-online.spec.ts`

**Interfaces:**
- Consumes: `createMeetingForClass`, `updateMeetingForClass`; entidad `liveClass` con los nuevos campos (Task 1).

- [ ] **Step 1: Guarda "online requiere link"** — en `handleSubmit`, si `isOnline` y `hasVideoProvider` y no hay `meetingUrlValue.trim()`, cortar con `setError("Genera el link con el botón o pega uno manualmente.")` (misma guarda que el form de crear, hoy ausente en editar).

- [ ] **Step 2: Estado provider+externalId** — inicializar desde `liveClass.meetingProvider` / `liveClass.meetingExternalId`. Auto-generar (mismo `useEffect` con debounce que Task 5) cuando corresponde. Si ya hay `meetingExternalId` y cambia la hora/nombre en el form, llamar `updateMeetingForClass` (PATCH) en vez de recrear.

- [ ] **Step 3: Persistir en submit** — pasar `meetingProvider`/`meetingExternalId` en `formPayload` (y por ende a `updateLiveClass`/`updateSeriesClasses`).

- [ ] **Step 4: E2E** — editar una clase presencial → marcarla online → verificar que se auto-genera el link y que guardar sin link muestra el error de la guarda.

Run: `E2E_PORT=3001 npx playwright test e2e/horarios-online.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/panel/horarios/[id]/EditClassForm.tsx" "app/panel/horarios/[id]/page.tsx" e2e/horarios-online.spec.ts
git commit -m "feat(video): auto-genera link y agrega guarda online-requiere-link al editar clase"
```

---

## Notas de integración

- **DTO de la agenda:** `isOnline` sigue derivándose de tener link; no hace falta exponer `meetingUrl` al alumno. El tag Online/Presencial ya funciona con `isOnline`.
- **Verificación final:** correr `npm run lint && npm run typecheck && npm run test && npm run e2e` antes del PR.
- **No** llamar APIs reales de Zoom/Meet en CI: todos los tests mockean red.
