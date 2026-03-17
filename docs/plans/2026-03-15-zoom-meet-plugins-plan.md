# Plugins Zoom y Google Meet — Plan de implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir que cada centro conecte su cuenta Zoom y/o Google Meet vía OAuth, y que al marcar "Clase online" en horarios se cree la reunión automáticamente y se muestre la URL copiable; con documentación self-service para obtener credenciales.

**Architecture:** OAuth por centro (como MercadoPago). Tablas `CenterZoomConfig` y `CenterGoogleMeetConfig` para tokens. Rutas `/api/admin/zoom/oauth` y `/api/admin/google-meet/oauth` + callbacks. Servicio de aplicación que llama a Zoom API (POST /users/me/meetings) y Google Calendar API (events.insert con conferenceData) para crear reuniones; devuelve join_url/hangoutLink. En horarios: habilitar "Clase online" si hay al menos un plugin activo; si hay dos, selector antes de crear; fallback a campo manual + Reintentar.

**Tech Stack:** Next.js App Router, Prisma, Zoom OAuth 2.0 + REST, Google APIs (googleapis) OAuth2 + Calendar API.

**Design reference:** `docs/plans/2026-03-15-zoom-meet-plugins-design.md`

---

## Fase 1 — Schema y repositorios

### Task 1.1: Modelos Prisma para Zoom y Meet

**Files:**
- Modify: `prisma/schema.prisma` (tras el modelo `CenterMercadoPagoConfig`)

**Step 1:** Añadir modelos y relación en Center.

En `prisma/schema.prisma`, después de `CenterMercadoPagoConfig` (y antes de `PlanType`), añadir:

```prisma
model CenterZoomConfig {
  id              String    @id @default(cuid())
  centerId        String    @unique
  accessToken     String
  refreshToken    String?
  tokenExpiresAt  DateTime?
  enabled         Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)
}

model CenterGoogleMeetConfig {
  id              String    @id @default(cuid())
  centerId        String    @unique
  accessToken     String
  refreshToken    String?
  tokenExpiresAt  DateTime?
  enabled         Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)
}
```

En el modelo `Center`, añadir en la sección de relaciones:

```prisma
  zoomConfig       CenterZoomConfig?
  googleMeetConfig CenterGoogleMeetConfig?
```

**Step 2:** Crear migración.

Run: `npx prisma migrate dev --name add_zoom_google_meet_config`
Expected: Migración creada y aplicada.

**Step 3:** Commit.

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(plugins): add CenterZoomConfig and CenterGoogleMeetConfig models"
```

---

### Task 1.2: Ports para Zoom y Meet config

**Files:**
- Create: `lib/ports/zoom-config-repository.ts`
- Create: `lib/ports/google-meet-config-repository.ts`
- Modify: `lib/ports/index.ts`

**Step 1:** Crear port Zoom.

Crear `lib/ports/zoom-config-repository.ts`:

```ts
export interface ZoomConfig {
  centerId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  enabled: boolean;
}

export interface IZoomConfigRepository {
  findByCenterId(centerId: string): Promise<ZoomConfig | null>;
  findStatusByCenterId(centerId: string): Promise<{ enabled: boolean; hasCredentials: boolean } | null>;
  upsert(centerId: string, data: { accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null; enabled?: boolean }): Promise<void>;
  updateEnabled(centerId: string, enabled: boolean): Promise<void>;
}
```

**Step 2:** Crear port Google Meet (misma interfaz conceptual).

Crear `lib/ports/google-meet-config-repository.ts` con la misma forma que Zoom (GoogleMeetConfig, IGoogleMeetConfigRepository con findByCenterId, findStatusByCenterId, upsert, updateEnabled).

**Step 3:** Exportar desde `lib/ports/index.ts`.

Añadir:
`export type { IZoomConfigRepository, ZoomConfig } from "./zoom-config-repository";`
`export type { IGoogleMeetConfigRepository, GoogleMeetConfig } from "./google-meet-config-repository";`

**Step 4:** Commit.

```bash
git add lib/ports/
git commit -m "feat(plugins): add Zoom and Google Meet config ports"
```

---

### Task 1.3: Adaptadores DB Zoom y Meet

**Files:**
- Create: `lib/adapters/db/zoom-config-repository.ts`
- Create: `lib/adapters/db/google-meet-config-repository.ts`
- Modify: `lib/adapters/db/index.ts`

**Step 1:** Implementar `zoom-config-repository.ts` usando prisma.centerZoomConfig (findUnique, upsert, update), mapeando a dominio ZoomConfig. findStatusByCenterId devuelve { enabled, hasCredentials: !!accessToken }.

**Step 2:** Implementar `google-meet-config-repository.ts` análogo para CenterGoogleMeetConfig.

**Step 3:** En `lib/adapters/db/index.ts` añadir:
`export { zoomConfigRepository } from "./zoom-config-repository";`
`export { googleMeetConfigRepository } from "./google-meet-config-repository";`

**Step 4:** Commit.

```bash
git add lib/adapters/db/
git commit -m "feat(plugins): add Zoom and Google Meet config repositories"
```

---

## Fase 2 — OAuth Zoom

### Task 2.1: Ruta de inicio OAuth Zoom

**Files:**
- Create: `app/api/admin/zoom/oauth/route.ts`

**Step 1:** Implementar GET que: verifique sesión admin y centerId; lea ZOOM_CLIENT_ID de ENV; construya redirectUri = `${baseUrl}/api/admin/zoom/oauth/callback`; redirija a `https://zoom.us/oauth/authorize` con response_type=code, client_id, redirect_uri, state=centerId. Si no hay ZOOM_CLIENT_ID responder 500.

Referencia: `app/api/admin/mercadopago/oauth/route.ts`. Zoom usa `https://zoom.us/oauth/authorize` (documentación Zoom OAuth).

**Step 2:** Commit.

```bash
git add app/api/admin/zoom/
git commit -m "feat(plugins): add Zoom OAuth start route"
```

---

### Task 2.2: Callback OAuth Zoom

**Files:**
- Create: `app/api/admin/zoom/oauth/callback/route.ts`

**Step 1:** GET: validar sesión, code y state=centerId. Intercambiar code por tokens en `https://zoom.us/oauth/token` (POST, grant_type=authorization_code, code, redirect_uri, client_id, client_secret en body). Zoom devuelve access_token, refresh_token, expires_in. Calcular tokenExpiresAt; upsert en CenterZoomConfig vía zoomConfigRepository (o prisma directo). Redirigir a `/panel/plugins/zoom?success=connected` o `?error=...` si falla.

**Step 2:** Commit.

```bash
git add app/api/admin/zoom/oauth/callback/
git commit -m "feat(plugins): add Zoom OAuth callback and token storage"
```

---

## Fase 3 — OAuth Google Meet

### Task 3.1: Ruta de inicio OAuth Google Meet

**Files:**
- Create: `app/api/admin/google-meet/oauth/route.ts`

**Step 1:** GET: sesión admin, centerId; GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET de ENV. Redirect URI = `${baseUrl}/api/admin/google-meet/oauth/callback`. Redirigir a `https://accounts.google.com/o/oauth2/v2/auth` con client_id, redirect_uri, response_type=code, scope=https://www.googleapis.com/auth/calendar, state=centerId, access_type=offline, prompt=consent (para recibir refresh_token).

**Step 2:** Commit.

```bash
git add app/api/admin/google-meet/
git commit -m "feat(plugins): add Google Meet OAuth start route"
```

---

### Task 3.2: Callback OAuth Google Meet

**Files:**
- Create: `app/api/admin/google-meet/oauth/callback/route.ts`

**Step 1:** GET: validar code y state. POST a `https://oauth2.googleapis.com/token` con grant_type=authorization_code, code, redirect_uri, client_id, client_secret. Respuesta: access_token, refresh_token, expires_in. Upsert CenterGoogleMeetConfig. Redirigir a `/panel/plugins/meet?success=connected` o error.

**Step 2:** Commit.

```bash
git add app/api/admin/google-meet/oauth/callback/
git commit -m "feat(plugins): add Google Meet OAuth callback and token storage"
```

---

## Fase 4 — Páginas de plugins y lista

### Task 4.1: Página plugin Zoom

**Files:**
- Create: `app/panel/plugins/zoom/page.tsx`

**Step 1:** Página similar a `app/panel/plugins/mercadopago/page.tsx`: auth, isAdminRole, centerId. Usar zoomConfigRepository.findStatusByCenterId(centerId). Si no hay config: mensaje "Conectá tu cuenta Zoom…", enlace a `/api/admin/zoom/oauth` si hay ZOOM_CLIENT_ID en ENV, sino mensaje "Contactar al administrador (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET)". Si hay config: estado "Conectado", toggle enabled (form con server action que llame a updateEnabled), enlace "Reconectar" a `/api/admin/zoom/oauth`. Incluir sección colapsable o visible "Cómo obtener tus credenciales" con texto en español y enlaces a Zoom Marketplace / desarrolladores Zoom para crear app OAuth y configurar Redirect URL.

**Step 2:** Commit.

```bash
git add app/panel/plugins/zoom/
git commit -m "feat(plugins): add Zoom plugin page with connect and docs"
```

---

### Task 4.2: Página plugin Google Meet

**Files:**
- Create: `app/panel/plugins/meet/page.tsx`

**Step 1:** Igual que Zoom pero para Meet: googleMeetConfigRepository, GOOGLE_CLIENT_ID, `/api/admin/google-meet/oauth`. Sección "Cómo obtener tus credenciales": Google Cloud Console, crear proyecto, activar Calendar API, credenciales OAuth 2.0 (tipo aplicación web), URI de redirección, scopes calendar. Español.

**Step 2:** Commit.

```bash
git add app/panel/plugins/meet/
git commit -m "feat(plugins): add Google Meet plugin page with connect and docs"
```

---

### Task 4.3: Actualizar lista de plugins y navegación

**Files:**
- Modify: `app/panel/plugins/page.tsx`

**Step 1:** Obtener estado de Zoom y Meet: zoomConfigRepository.findStatusByCenterId(centerId), googleMeetConfigRepository.findStatusByCenterId(centerId). En el array `plugins`, cambiar Zoom y Meet de slug "#" a slug "zoom" y "meet", y active = resultado de findStatusByCenterId (enabled && hasCredentials). Quitar "Próximamente" para Zoom y Meet.

**Step 2:** Commit.

```bash
git add app/panel/plugins/page.tsx
git commit -m "feat(plugins): wire Zoom and Meet in plugins list and show active status"
```

---

## Fase 5 — Crear reuniones (servicio y uso)

### Task 5.1: Servicio crear reunión Zoom

**Files:**
- Create: `lib/application/create-zoom-meeting.ts`

**Step 1:** Función `createZoomMeeting(centerId: string, params: { title: string; startTime: Date; durationMinutes: number; timezone?: string })`: usar zoomConfigRepository.findByCenterId(centerId). Si no hay config o !enabled, throw. Si token expirado, llamar a Zoom refresh token (POST https://zoom.us/oauth/token grant_type=refresh_token) y actualizar config. Luego POST https://api.zoom.us/v2/users/me/meetings con body { topic: title, start_time: startTime en ISO, duration: durationMinutes, timezone }. Headers Authorization: Bearer accessToken. De la respuesta tomar join_url; return { joinUrl: join_url }.

**Step 2:** Commit.

```bash
git add lib/application/create-zoom-meeting.ts
git commit -m "feat(plugins): add createZoomMeeting service"
```

---

### Task 5.2: Servicio crear reunión Google Meet

**Files:**
- Create: `lib/application/create-google-meet-meeting.ts`

**Step 1:** Usar Google APIs Node client (googleapis) o fetch. OAuth2 client con access_token del center; si expirado, usar refresh_token contra oauth2.googleapis.com/token y actualizar config. Calendar API: events.insert con conferenceData.createRequest (type hangoutsMeet), conferenceDataVersion=1. start/end con dateTime ISO y timeZone. Del response tomar hangoutLink; return { joinUrl: hangoutLink }.

Si no se quiere añadir dependencia googleapis, se puede usar fetch a `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1` con método POST y body con start, end, conferenceData.

**Step 2:** Commit.

```bash
git add lib/application/create-google-meet-meeting.ts
git commit -m "feat(plugins): add createGoogleMeetMeeting service"
```

---

### Task 5.3: Server action para crear reunión (horarios)

**Files:**
- Create: `app/panel/horarios/actions-video.ts` (o extender `app/panel/horarios/actions.ts`)

**Step 1:** Exportar `createMeetingForClass(provider: 'zoom' | 'meet', params: { title: string; startTime: string; durationMinutes: number })`. requireAdminCenterId(); según provider llamar a createZoomMeeting o createGoogleMeetMeeting; devolver { joinUrl } o throw con mensaje amigable. Así el formulario puede llamar a esta action antes de guardar la clase/serie cuando "Clase online" está marcado.

**Step 2:** Commit.

```bash
git add app/panel/horarios/
git commit -m "feat(horarios): add createMeetingForClass server action"
```

---

## Fase 6 — UI Horarios: Clase online y URL copiable

### Task 6.1: Habilitar "Clase online" y obtener proveedores activos

**Files:**
- Modify: `app/panel/horarios/nueva/page.tsx` (o donde se renderiza CreateClassForm)
- Modify: `app/panel/horarios/nueva/CreateClassForm.tsx`

**Step 1:** En la página que renderiza CreateClassForm, obtener zoomStatus y meetStatus (findStatusByCenterId) y pasar props `videoProviders: { zoom: boolean; meet: boolean }` (true si enabled && hasCredentials). CreateClassForm recibe `videoProviders`.

**Step 2:** En CreateClassForm: si videoProviders.zoom || videoProviders.meet, el checkbox "Clase online" está habilitado (quitar disabled y cursor-not-allowed). Si ambos true, al marcar "Clase online" mostrar selector (radio o modal) "Crear con Zoom" / "Crear con Google Meet" y guardar la elección en estado (providerPreference).

**Step 3:** Commit.

```bash
git add app/panel/horarios/
git commit -m "feat(horarios): enable Clase online when Zoom or Meet configured, add provider selector"
```

---

### Task 6.2: Crear reunión al guardar y mostrar URL copiable

**Files:**
- Modify: `app/panel/horarios/nueva/CreateClassForm.tsx`
- Modify: `app/panel/horarios/actions.ts` si hace falta recibir meetingUrl ya generado

**Step 1:** Al enviar el formulario con "Clase online" marcado: si hay un solo proveedor, llamar a createMeetingForClass(provider, { title, startTime: startsAt, durationMinutes }). Si hay dos, usar el elegido en el selector. Si la llamada tiene éxito, pasar el joinUrl como meetingUrl al createLiveClass. Si falla, no redirigir; mostrar error en pantalla, mostrar campo de texto "URL de reunión (manual)" y botón "Reintentar" que vuelve a llamar a createMeetingForClass. Al guardar con URL manual, enviar ese valor como meetingUrl.

**Step 2:** Tras guardar con éxito, la redirección va a /panel/horarios. En la vista de horarios (o en el detalle de la clase/serie) mostrar meetingUrl como texto copiable (ej. input readonly con botón "Copiar" o link que se puede copiar). Esto puede estar ya parcialmente en la vista de detalle de clase; asegurarse de que la URL se muestre y sea copiable.

**Step 3:** Commit.

```bash
git add app/panel/horarios/
git commit -m "feat(horarios): create meeting on save when online, show copyable URL and manual fallback"
```

---

### Task 6.3: Editar clase/serie con Clase online

**Files:**
- Modify: `app/panel/horarios/[id]/EditClassForm.tsx` (o equivalente para edición)
- Modify: `app/panel/horarios/actions.ts` (updateLiveClass, updateSeries si aplica)

**Step 1:** En la página de edición, recibir videoProviders. Si el usuario activa "Clase online" y no hay meetingUrl aún, intentar crear reunión (misma lógica: un proveedor o selector, luego createMeetingForClass). Si falla, campo manual + Reintentar. Si desmarca "Clase online", enviar meetingUrl: null (solo BD).

**Step 2:** Commit.

```bash
git add app/panel/horarios/
git commit -m "feat(horarios): edit class/series with online meeting create and manual fallback"
```

---

## Fase 7 — Documentación y E2E

### Task 7.1: Documentación self-service en docs

**Files:**
- Create: `docs/plugins/zoom-credenciales.md`
- Create: `docs/plugins/google-meet-credenciales.md`

**Step 1:** Redactar en español pasos para Zoom: ir a Zoom Marketplace / desarrolladores, crear app OAuth, configurar Redirect URL, copiar Client ID y Client Secret. Redactar para Google: Google Cloud Console, proyecto, Calendar API, credenciales OAuth 2.0, redirect URI, scopes. Opcional: enlace desde las páginas de plugin a estos docs.

**Step 2:** Commit.

```bash
git add docs/plugins/
git commit -m "docs: add self-service guides for Zoom and Google Meet credentials"
```

---

### Task 7.2: E2E y ajustes finales

**Files:**
- Modify: `e2e/panel-plugins.spec.ts`
- Modify: `.env.example` (si existe) o documentar en README/env

**Step 1:** Añadir en .env.example (o en docs) las variables ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y las URLs de callback esperadas.

**Step 2:** En E2E de plugins: si ya se comprueba "admin puede abrir plugins y ve marketplace", ampliar para que al menos se vean las cards de Zoom y Meet con enlaces a /panel/plugins/zoom y /panel/plugins/meet (sin requerir credenciales ENV en el test). Opcional: test que con slug zoom/meet se cargue la página correspondiente.

**Step 3:** Commit.

```bash
git add e2e/ .env.example docs/
git commit -m "chore: env docs and plugin E2E for Zoom/Meet"
```

---

## Resumen de orden de tareas

1. Task 1.1 — Schema Prisma Zoom/Meet  
2. Task 1.2 — Ports Zoom/Meet  
3. Task 1.3 — Adapters DB Zoom/Meet  
4. Task 2.1 — OAuth Zoom start  
5. Task 2.2 — OAuth Zoom callback  
6. Task 3.1 — OAuth Google start  
7. Task 3.2 — OAuth Google callback  
8. Task 4.1 — Página plugin Zoom  
9. Task 4.2 — Página plugin Meet  
10. Task 4.3 — Lista plugins  
11. Task 5.1 — createZoomMeeting  
12. Task 5.2 — createGoogleMeetMeeting  
13. Task 5.3 — createMeetingForClass action  
14. Task 6.1 — Habilitar checkbox y selector proveedor  
15. Task 6.2 — Crear reunión al guardar, URL copiable, fallback  
16. Task 6.3 — Edición clase/serie online  
17. Task 7.1 — Docs self-service  
18. Task 7.2 — ENV docs y E2E  

---

**Plan completo y guardado en `docs/plans/2026-03-15-zoom-meet-plugins-plan.md`.**

Opciones de ejecución:

1. **Subagent-driven (esta sesión)** — Ir despachando un subagente por tarea, revisar entre tareas, iteración rápida.
2. **Sesión paralela (separada)** — Abrir nueva sesión en el worktree con executing-plans y ejecutar por lotes con checkpoints.

¿Con cuál querés seguir?
