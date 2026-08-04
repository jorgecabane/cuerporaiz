# Auto-generación y sincronización del link de video (Zoom / Meet) — Diseño

**Fecha:** 2026-08-03
**Estado:** Diseño aprobado (pendiente escribir plan de implementación)

## Problema

Hoy, para que una clase online tenga link de Zoom/Meet, el admin debe apretar
manualmente un botón "Generar link" **antes** de guardar. Esto genera dos
problemas reales:

1. **Gotcha "online sin link → presencial":** el sistema deriva
   `isOnline = !!meetingUrl`. Si el admin marca "online" pero no genera/pega un
   link, la clase se guarda **silenciosamente como presencial**. El formulario
   de **crear** bloquea este caso con un aviso; el de **editar NO** —
   inconsistencia real.
2. **Fricción:** generar el link es un paso manual extra y fácil de olvidar,
   sobre todo en series recurrentes.

Además, hoy el link es un **string inmutable**: si cambia el nombre o la hora de
la clase, la reunión en Zoom/Meet queda desincronizada (el link sigue
funcionando, pero el título/hora de la reunión no reflejan la clase).

## Objetivo

Que el link de video se genere **automáticamente** cuando corresponde, y que al
editar nombre/hora la reunión se **actualice por debajo manteniendo el mismo
link** (sin romper el enlace que los alumnos ya tienen).

## Hallazgos de los proveedores (investigación)

- **Zoom:** una reunión recurrente expone **un solo `join_url` reutilizable**
  para todas las ocurrencias; el tipo 3 ("recurring, no fixed time") da un link
  permanente y no requiere agendar cada ocurrencia. Los `join_url` de Zoom no
  están limitados a la hora agendada. Update vía `PATCH /meetings/{meetingId}`.
- **Google Meet (Calendar):** un evento recurrente lleva **un link de Meet
  compartido** por todas las instancias (vive en el evento). Update vía
  `PATCH /calendars/primary/events/{eventId}?conferenceDataVersion=1`; el link se
  conserva al hacer PATCH.
- **Conclusión:** el modelo "un link compartido por serie" es exactamente el que
  ambos proveedores recomiendan. El patrón estándar (confirmado por un dev
  advocate de Google) es **persistir el mapping evento ↔ ID de la reunión**.

## Estado actual del código (verificado)

- `createZoomMeeting` y `createGoogleMeetMeeting` (en `lib/application/`) crean la
  reunión pero devuelven **solo `joinUrl`**. La respuesta de ambas APIs **ya
  incluye el ID** (`data.id`) — solo no se devuelve ni persiste hoy.
- `LiveClass` y `LiveClassSeries` guardan solo `meetingUrl String?` — sin
  provider ni ID externo.
- `generateSeriesInstances` copia correctamente `isOnline` **y** `meetingUrl` de
  la serie a cada instancia (verificado ejecutándolo: 8/8 instancias heredan
  ambos). **No hay bug de propagación.**
- El flujo de edición (`updateSeriesClasses`) propaga `isOnline` + `meetingUrl`
  en todos los scopes (`this` / `thisAndFollowing` / `all`), persistiendo ambos
  campos (verificado en `live-class-repository.ts`).

## Decisiones de diseño (acordadas)

1. **Auto-generar en vivo (en el formulario):** cuando la clase es online + hay
   **exactamente un** proveedor conectado + ya están nombre y fecha/hora → se
   genera el link automáticamente (sin botón). Si faltan campos, se muestra el
   botón deshabilitado con el aviso "Completa nombre y fecha/hora para generar el
   link". Con **dos** proveedores conectados → se muestran botones manuales
   (Zoom / Meet) como hoy.
2. **Anti-fantasma:** dentro de la misma sesión de formulario, si el admin
   cambia la hora después de auto-generar, se hace **PATCH a la misma reunión**
   (usando el ID en estado del formulario) en vez de crear una nueva. Una sesión
   de formulario = una sola reunión.
3. **Actualizar por debajo (mismo link):** al editar una clase que ya tiene
   reunión (con ID persistido):
   - Cambia **nombre** → PATCH del topic/summary.
   - Cambia **hora** en clase **única** → PATCH del start_time/duration.
   - En **serie**, el link compartido no depende de la hora → no-op para el link.
4. **Desacoplar instancia suelta:** al editar "solo esta clase" (scope `this`),
   la instancia se desacopla y recibe su **propia reunión independiente** con su
   propio link e ID, separada del link compartido de la serie.
5. **Dos proveedores conectados:** elección manual (sin auto).
6. **Falla del proveedor:** error claro + permitir pegar link manual; **no** se
   guarda una clase online sin link (misma guarda que ya tiene el form de crear,
   ahora también en editar).

## Casos borde (decididos)

- **Clases legacy** (tienen `meetingUrl` pero sin `meetingExternalId`): al
  editarlas no se puede hacer PATCH (no hay ID). Se conserva el link como está y
  el admin puede regenerar manualmente. No rompe nada.
- **Desmarcar online / borrar clase:** best-effort borrar la reunión en el
  proveedor (`DELETE /meetings/{id}` / borrar evento). Si falla, no bloquea la
  operación; solo se loguea.
- **Recurrentes en Zoom:** para series se usa una reunión recurrente sin hora
  fija (type 3) → link permanente compartido; para clases únicas, agendada
  (type 2). Para Google, la serie usa un evento cuyo link se reutiliza en todas
  las instancias (como hoy), con su `eventId` persistido para PATCH del summary.

## Modelo de datos (migración)

Agregar a `LiveClass` y `LiveClassSeries`:

```prisma
meetingProvider   String?   // "zoom" | "meet"
meetingExternalId String?   // Zoom meetingId | Google eventId
```

`meetingUrl` se mantiene. Filas existentes quedan con `meetingProvider = null`
y `meetingExternalId = null` (legacy → no PATCH).

## Arquitectura (hexagonal)

- **`lib/application/create-zoom-meeting.ts`** / **`create-google-meet-meeting.ts`**:
  extender el resultado para devolver `{ joinUrl, externalId }`. Para Zoom,
  aceptar `recurring: boolean` (type 3 vs 2).
- **Nuevas funciones**: `updateZoomMeeting(centerId, meetingId, params)` y
  `updateGoogleMeetMeeting(centerId, eventId, params)` (PATCH) +
  `deleteZoomMeeting` / `deleteGoogleMeetMeeting` (best-effort).
- **Server actions** (`app/panel/horarios/actions.ts`): `createMeetingForClass`
  devuelve también `externalId` y `provider`; nueva `updateMeetingForClass`.
  `createLiveClass` / `updateLiveClass` / `updateSeriesClasses` persisten
  `meetingProvider` + `meetingExternalId`; disparan PATCH cuando corresponde;
  best-effort delete al desvincular.
- **Formularios** (`CreateClassForm`, `EditClassForm`): auto-generar al completar
  campos (con debounce), guardar `externalId`/`provider` en estado, PATCH
  in-form al cambiar hora, guarda "online requiere link" también en editar.

## Testing

- **Unit** (Vitest): create/update devuelven `externalId`; propagación de
  provider+ID en `generateSeriesInstances`; la guarda "online sin link" en
  editar; la lógica de "auto solo con un proveedor".
- **E2E** (Playwright): mockear las APIs de Zoom/Meet (no llamadas reales en CI).
- Los tests de series existentes deben seguir pasando (no romper propagación).

## Fuera de alcance (v1)

- Link independiente por instancia de una serie (más allá del desacople de una
  instancia suelta). Las series comparten un link, como recomiendan los
  proveedores.
- Migrar clases legacy a tener `meetingExternalId` retroactivamente.
