# Panel — Mis reservas (Bottom Sheet) + Cancelaciones (Design)

Relacionado con: `docs/plans/2026-03-panel-home-refactor-brainstorming.md`

## Objetivo

Incorporar una experiencia **mobile-first** para que el usuario (principalmente **Estudiante**) pueda:

- Ver sus reservas en contexto desde el home del panel (`/panel`) sin navegar a otra pantalla.
- Cancelar reservas aplicando las políticas del centro:
  - **Ventana para reservar** (config existente).
  - **Horas antes para cancelar sin consumir** \(X, config existente).

## Alcance (MVP)

### 1) UI: “Mis reservas” como bottom sheet con tabs

En `/panel` (home), para rol Estudiante:

- CTA principal: **Reservar clase**
- Acción secundaria: **Mis reservas** → abre un componente **reutilizable** tipo sheet/modal con tabs.

Contenido de “Mis reservas”:

- Tabs: **Hoy / Próximas / Canceladas / Históricas**
- Lista compacta por tab
- Acciones por ítem:
  - En **Hoy** y **Próximas**: botón **Cancelar** si `canCancel=true`
  - En **Canceladas** y **Históricas**: sin CTA (solo lectura / ver detalle si aplica)

### 2) Políticas de cancelación (cliente)

Definición:

- \(X\) = “Horas antes para cancelar (sin consumir clase)” (config del centro).

Reglas:

- Si `now >= startsAt`: **no permitir cancelar** (clase ya inició).
- Si `startsAt - now >= X horas`:
  - Cancelación **a tiempo** → estado `CANCELLED`
  - **No consume** clase/credit
  - **Libera cupo**
- Si `startsAt - now < X horas`:
  - Cancelación **tardía** → estado `LATE_CANCELLED`
  - **Consume 1 clase**
  - **Libera cupo**

UX de confirmación:

- Modal dinámico (a tiempo vs tardía) informando explícitamente si **consume** o no.

## Comportamiento responsive (recomendación UX)

Se implementa como un componente reutilizable con `variant="auto"`:

- **Móvil**: bottom sheet con altura **80–85vh**, backdrop y:
  - Tap afuera para cerrar
  - Gesto swipe-down para cerrar
  - Botón “Cerrar” visible (accesibilidad)
- **Desktop**: **modal centrado** (dialog):
  - Ancho fijo aprox. 520–640px
  - Altura máxima 70–80vh
  - Scroll interno para la lista

Motivo: en desktop un “sheet 85vh” se siente como UI móvil escalada; el modal centrado es más limpio para una acción rápida (“ver/cancelar”).

## Especificación UI (detalle)

### Trigger en Home (Estudiante)

- Botón secundario o link: **Mis reservas**
- Microcopy en items (cuando estén visibles) o en el sheet: “Cancelación sin cargo hasta \(X\) h antes”.

### Estructura del sheet/modal

Header fijo:

- Título: “Mis reservas”
- Icono/botón de cerrar

Tabs (segmented control / pills):

- Hoy
- Próximas
- Canceladas
- Históricas

Lista:

- Ítem (1 línea): “Clase · HH:mm”
- Subtexto (1 línea): “dd/mm · (sala o profe)”
- Badges:
  - En Canceladas: “A tiempo” vs “Tarde”

### Cancelar (flujos)

Acción:

- Tap “Cancelar” → confirm modal

Confirm modal (copys de referencia):

- A tiempo:
  - Título: “¿Cancelar reserva?”
  - Texto: “Podés cancelar sin perder tu clase. Se liberará tu cupo para otra persona.”
  - CTA: “Sí, cancelar”
- Tardía:
  - Título: “Cancelación tardía”
  - Texto: “Estás dentro del período de cancelación tardía. **Se descontará 1 clase** de tu plan. Se liberará tu cupo.”
  - CTA: “Cancelar igual”

Feedback:

- Toast éxito (a tiempo): “Reserva cancelada. No se descontó ninguna clase.”
- Toast éxito (tardía): “Reserva cancelada. Se descontó 1 clase.”
- El ítem se actualiza/mueve a la tab **Canceladas** sin recargar toda la página (ideal).

## Estados / segmentación de listas

Recomendación de segmentación (derivable desde backend):

- **Hoy**: `BOOKED` con `startsAt` dentro del día actual.
- **Próximas**: `BOOKED` con `startsAt > now` (y fuera de “hoy” si se separa).
- **Canceladas**: `CANCELLED` y `LATE_CANCELLED`.
- **Históricas**: `ATTENDED` y `NO_SHOW` (si existe), u otras pasadas no canceladas.

## Contrato backend recomendado (para evitar lógica duplicada)

En el listado de reservas, ideal recibir:

- `canCancel: boolean`
- `willConsumeClassIfCancelNow: boolean`
- `cancelDeadlineAt` (o `minutesToStart`)

En el endpoint de cancelar:

- `newStatus`
- `consumesClassApplied`
- `policyAppliedX`

## Reutilización del componente

Componente sugerido: `BottomSheet` / `AdaptiveSheet` (nombre a definir), reutilizable en otras vistas.

Props mínimas sugeridas:

- `open`, `onOpenChange`
- `title`
- `children`
- `variant: 'auto' | 'sheet' | 'dialog'`
- `dismissible` (tap backdrop)
- `showDragHandle` (móvil)
- `maxHeight` por breakpoint

Requisitos UX internos:

- Focus trap + cierre con `Esc`
- Scroll bloqueado en body cuando está abierto
- Respeta `prefers-reduced-motion`

## Fuera de alcance (por ahora)

- Lista de espera / auto-fill
- Aprobaciones manuales de cancelación
- Penalizaciones configurables distintas por tipo de clase

