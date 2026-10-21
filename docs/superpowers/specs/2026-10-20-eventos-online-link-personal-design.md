# Eventos online con link personal por asistente

**Fecha:** 2026-10-20 · **Estado:** diseño aprobado en conversación, pendiente revisión del spec

## Objetivo

Que el admin pueda marcar un evento como online y que cada cupo vendido tenga un **link personal**
(`/eventos/entrar/[token]`). El link muestra una sala de espera hasta 10 minutos antes del inicio y
luego redirige a la reunión real (Zoom o Meet). El link real nunca se publica.

**Éxito:**
- Compro 4 entradas → recibo 4 links distintos; si dejé el correo de un asistente, a él le llega el suyo.
- Antes de la hora veo una sala de espera con cuenta regresiva que me redirige sola.
- El admin ve qué asistentes entraron y puede revocar un link.

**Contexto:** el centro usa Zoom gratis (corte a los 40 min). Si el host reinicia la reunión con el
mismo link, nuestro link personal sigue funcionando hasta `endsAt`; no requiere diseño adicional.

## Fuera de alcance

- Atar el link a un dispositivo.
- Meet con invitados en Calendar / registro de Zoom pagado.
- Editar nombre/correo de asistentes después de la compra.
- Pedir datos de asistentes en "Agregar más cupos" (los cupos nuevos se crean sin datos; el comprador reenvía su link).

## Modelo de datos

`Event` suma:
- `isOnline Boolean @default(false)`
- `meetingUrl String?` — link real; sólo lo leen el panel admin y la redirección.

Nuevo `EventAttendee` (un registro por cupo):

| Campo | Tipo | Nota |
|---|---|---|
| `id` | cuid | |
| `ticketId` | FK → EventTicket, cascade | |
| `seat` | Int | 1…quantity |
| `token` | String @unique | `crypto.randomBytes(32).toString("base64url")`, igual que `claimToken` |
| `name` | String? | opcional |
| `email` | String? | opcional |
| `firstEnteredAt` | DateTime? | |
| `lastEnteredAt` | DateTime? | |
| `revokedAt` | DateTime? | |
| `reminderSentAt` | DateTime? | dedupe del recordatorio |
| `createdAt` | DateTime | |

`@@unique([ticketId, seat])`.

Migración aditiva (sin backfill: eventos existentes quedan `isOnline=false`).

## Componentes

### 1. Configuración del evento (`app/panel/eventos/nuevo/EventForm.tsx`, crear y editar)

- Check "Evento online" (visible siempre).
- Al marcarlo, si el centro tiene Zoom o Meet configurado y el formulario ya tiene título y fechas,
  **se genera el link automáticamente** llamando al server action existente de la agenda
  (`createMeetingForClass` en `app/panel/horarios/actions.ts`; se mueve a un módulo compartido o se
  reexporta, con `durationMinutes` = `endsAt - startsAt`). Proveedor: Zoom si está configurado, si no Meet.
- Estados: "Generando link…" → link generado (solo lectura, con botón "Regenerar").
- Si falla, o no hay proveedor configurado, o faltan título/fechas: mensaje de error + campo
  **"Pega el link de la reunión"** (URL `https://` validada con Zod en `createEvent`/`updateEvent`).
- Al guardar con `isOnline` sin link → error "Genera el link o pega uno manualmente." (mismo copy que la agenda).
- Desmarcar online limpia `meetingUrl`.

### 2. Creación de cupos (`EventAttendee`)

- **Checkout (`EventPurchasePanel.tsx` + `event-checkout.ts`)**, sólo si `event.isOnline` y modo `purchase`:
  bloque "Asistentes (opcional)" con N filas (nombre, correo); la fila 1 se precarga con los datos del
  comprador. Se validan con Zod (correo válido o vacío) y se guardan en `EventAttendee` al crear/reusar
  el ticket PENDING (reemplazando los existentes de ese ticket si reintenta).
- **Sincronización:** helper `ensureEventAttendees(ticketId, quantity)` en `lib/application/` que crea
  los cupos faltantes (`seat` max+1…quantity) sin datos. Idempotente. Se llama al inicio de
  `notifyEventTicketConfirmation`, que es el punto común de todo ticket que pasa a PAID o suma cupos
  (gratis, webhook MP, transferencia aprobada, ticket manual, re-compra). Sólo actúa si el evento es online.

### 3. Link personal y sala de espera (`app/eventos/entrar/[token]/page.tsx`)

Server component, `dynamic = "force-dynamic"`. Lógica de decisión en una función pura de dominio
(`lib/domain/event-entry.ts`: `resolveEventEntry({ attendee, ticketStatus, event, now })`) con tests unitarios:

| Condición | Resultado |
|---|---|
| token inexistente, revocado, ticket no PAID o evento no online / sin link | "Este link no es válido" + botón WhatsApp del centro (si existe) |
| evento CANCELLED | "Este evento fue cancelado" |
| `now > endsAt` | "Este evento ya terminó" |
| `now < startsAt - 10 min` | **Sala de espera** |
| resto | registrar entrada (`firstEnteredAt ??= now`, `lastEnteredAt = now`) y `redirect(meetingUrl)` |

`ENTRY_OPENS_MINUTES_BEFORE = 10` como constante en el módulo de dominio.

**Sala de espera:** título del evento, fecha/hora en la TZ del centro (`getPublicCenterTimezone`),
nombre del asistente si existe, cuenta regresiva (client component con `useTimezone`). Al llegar a cero
hace `router.refresh()`, que vuelve a pasar por el server y redirige. Respaldo: `refresh` cada 60 s.
Texto con `aria-live="polite"` para la cuenta regresiva. Usa los tokens de diseño del sitio.

El token no se loguea. La página lleva `robots: noindex`.

### 4. Correos

- **Confirmación (`buildEventTicketConfirmationEmail`)**: si el evento es online, bloque "Tus entradas"
  con "Entrada 1…N" (nombre del asistente si existe) y su link personal. Va al comprador.
- **Correo por asistente** (nuevo builder en `lib/email/event.ts`): a cada `EventAttendee` con correo
  distinto al del comprador, al crearse su cupo: "Tienes una entrada para {evento}" + su link.
  Asistentes sin cuenta → sin preferencias de correo (transaccional).
- **Recordatorio ~2 h antes**: se agrega al cron existente `app/api/cron/class-reminder/route.ts`
  (no nuevos crons: Vercel Hobby). Busca `EventAttendee` con evento online en `[now+1h, now+3h]`,
  `reminderSentAt = null`, ticket PAID, no revocado; claim atómico con `updateMany` como las reservas.
  Destinatario: el correo del asistente, o el del comprador si no tiene. Si el comprador tiene varios
  cupos sin correo, recibe **un** recordatorio con todos sus links. Respeta `shouldSendEmail` para el comprador.

### 5. Página de confirmación (`app/eventos/confirmacion/[ticketId]`) y panel del comprador

Si el evento es online y el ticket PAID: sección "Tus entradas" con cada link, botón "Copiar" y
el nombre/correo si existe. Se muestra también en el detalle del evento en el panel del alumno.

### 6. Panel admin del evento (`app/panel/eventos/[id]/page.tsx`)

Si el evento es online: tabla "Asistentes online" con comprador, entrada N, nombre/correo,
"Entró a las HH:MM" (TZ del centro) o "No ha entrado", y botón "Revocar link"
(server action, `isAdminRole`, setea `revokedAt`; confirmación previa). Un link revocado no se reactiva
(YAGNI); si hace falta, se regenera más adelante.

## Errores

- Generación de reunión falla → campo manual (sección 1).
- `ensureEventAttendees` falla → se loguea y el correo se envía sin bloque de links; la página de
  confirmación vuelve a llamar `ensureEventAttendees` al renderizar, así el comprador siempre ve sus links.
- Correo por asistente falla → `sendEmailSafe` (no bloquea).

## Testing

- **Unit (Vitest):** `resolveEventEntry` (todas las filas de la tabla, bordes de los 10 min y `endsAt`);
  `ensureEventAttendees` (crea faltantes, idempotente, no toca eventos presenciales);
  DTO de asistentes (correo opcional/ inválido); builders de correo (bloque de links presente sólo si online).
- **E2E (Playwright):** admin crea evento online pegando link manual → compra free de 2 cupos con un
  asistente → la confirmación muestra 2 links → abrir un link antes de hora muestra la sala de espera →
  con evento en curso el link redirige (verificar `Location`) → admin ve "Entró" y revoca → el link
  revocado muestra "no es válido".

## Copy (chileno con tú, masculino genérico)

- "Evento online" · "Generando link…" · "No pudimos generar el link. Pega el link de la reunión."
- "Asistentes (opcional)" · "Si dejas su correo, le enviamos su link directo."
- "Tus entradas" · "Copiar link" · "Link copiado"
- Sala de espera: "Ya casi. La sala se abre 10 minutos antes." · "Te llevamos a la reunión automáticamente."
- "Este link no es válido." · "Este evento ya terminó." · "Revocar link" · "No ha entrado"
