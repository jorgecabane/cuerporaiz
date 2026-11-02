# Planes vencidos: que el alumno entienda que su plan venció y compre otro

**Fecha:** 2026-11-02 · **Estado:** aprobado en conversación

## Problema

Una alumna con "8 Clases al Mes" usó 6 de 8 clases y pasaron los 30 días. Al reservar le dice
"No tienes un plan activo para reservar clases", pero en Planes su plan aparece **Activo** con
"Quedan 2 clases". Trini (dueña del centro) pide que, pasados los días, el plan se muestre como
vencido, como en la app Vita que usa su profesor.

**Causa:** nada escribe `EXPIRED` en `UserPlan`. El estado guardado queda `ACTIVE` para siempre;
solo `isUserPlanUsable` (reserva, desbloqueo, lista de espera) mira fechas y clases. Todas las
pantallas confían en el estado guardado.

**Escala (prod, 2026-11-02):** de 83 planes guardados `ACTIVE` en el centro, 61 están vencidos por
fecha (33 con clases sin usar) y 5 están sin clases pero en fecha. 21 alumnos ven como "activo"
un plan que no les sirve.

## Objetivo

1. Toda pantalla muestra el estado **real** del plan, coherente con lo que deja hacer la reserva.
2. Si el alumno no tiene un plan vigente, ve de un vistazo que su plan venció (o se quedó sin
   clases) y un botón claro para comprar otro.
3. Aviso preventivo "Vence pronto", con anticipación configurable por el centro (default 7 días).

## Diseño

### 1. Estado visible calculado (dominio)

En `lib/domain/user-plan.ts`:

```ts
export type PlanDisplayStatus =
  | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "EXHAUSTED" | "FROZEN" | "CANCELLED";

export const DEFAULT_PLAN_EXPIRING_NOTICE_DAYS = 7;

export function getPlanDisplayStatus(
  plan: Pick<UserPlan, "status" | "validUntil" | "classesTotal" | "classesUsed" | "subscriptionId">,
  now: Date,
  noticeDays: number
): PlanDisplayStatus;
```

Orden de reglas:
1. Estado guardado `CANCELLED`, `FROZEN` o `EXPIRED` → ese mismo.
2. `validUntil < now` → `EXPIRED`.
3. `classesTotal !== null && classesUsed >= classesTotal` → `EXHAUSTED`.
4. Sin suscripción (`subscriptionId === null`) y `validUntil - now <= noticeDays` días → `EXPIRING_SOON`.
   Los planes recurrentes se renuevan solos: no se avisan.
5. Si no → `ACTIVE`.

`isPlanCurrent(s)` = `ACTIVE | EXPIRING_SOON` (el plan sirve para reservar).
`PLAN_DISPLAY_STATUS_LABELS`: Activo, Vence pronto, Vencido, Sin clases, Congelado, Cancelado.

`pickLapsedPlan(plans, now)`: el plan `EXPIRED`/`EXHAUSTED` más reciente (por `validUntil`, luego
`createdAt`), excluyendo los que fueron vencidos/cancelados/congelados manualmente: solo cuenta
si el estado guardado es `ACTIVE` (venció solo). Se usa cuando el alumno no tiene plan vigente.

`validFrom` futuro se muestra como Activo (caso raro, fuera de alcance).

No hay cambios en la base de datos para el estado: se calcula siempre al mostrar.

### 2. Configuración del centro

- Nuevo campo `Center.planExpiringNoticeDays Int @default(7)` (migración aditiva).
- Se edita en **Configuración** (`/panel/configuracion`, el formulario del menú), junto a
  "Avisar cuando se libere un cupo": *"Avisar que un plan vence pronto (días antes)"*, rango 1–30.
- Lo usan la pantalla (badge "Vence pronto") y el correo "Tu plan vence pronto".
- `app/panel/politicas` es una copia huérfana (nada la enlaza): no se toca.

### 3. Pantallas del alumno

**Planes (`/panel/tienda` → `MisPlansTabs`).** El servidor calcula `displayStatus` y lo manda en
cada `MisPlanItem` (no se calcula en el cliente, para no depender de su reloj).
- Pestaña **Activos**: solo planes vigentes (`isPlanCurrent`).
  - `EXPIRING_SOON`: badge "Vence pronto" y línea "Vence el 3 nov 2026 · te quedan 2 clases".
  - Si no hay planes vigentes y existe un plan caducado (`pickLapsedPlan`), se muestra su tarjeta:
    badge **Vencido** (o **Sin clases**), "Venció el 3 nov 2026" (o "Usaste todas tus clases"),
    "Usaste 6 de 8 clases" con barra, y botón **"Comprar otro plan"** que baja a la sección
    "Planes disponibles" (`#planes-disponibles`).
  - Si no hay nada: el texto actual "No tienes planes activos. Compra uno más abajo."
- Pestaña **Históricos**: todo lo no vigente, con su etiqueta real.

**Mi perfil → "Mi plan" (`PlanSummaryCard`).** Muestra el plan vigente más reciente; si no hay,
el plan caducado con su badge y el botón "Comprar otro plan". Usa las etiquetas del dominio
(se elimina la copia local `STATUS_LABELS`).

**Inicio del panel (`app/panel/page.tsx`).** "Plan activo" = primer plan vigente (no el primero
guardado como `ACTIVE`). Si no hay y existe uno caducado: "Tu plan 8 Clases al Mes venció el 3 de
noviembre" (o "…se quedó sin clases") + botón "Comprar otro plan". Si vence pronto, se agrega
"vence el 3 nov".

**Reserva (`reserve-class.ts`).** Cuando no hay plan LIVE usable y el alumno tiene un plan LIVE
caducado, el mensaje de `NO_ACTIVE_PLAN` pasa a:
- vencido: "Tu plan 8 Clases al Mes venció el 3 de noviembre. Compra otro para seguir reservando."
- sin clases: "Usaste todas las clases de tu plan 8 Clases al Mes. Compra otro para seguir reservando."
- sin plan: "No tienes un plan activo para reservar clases." (ahora con punto final).
El modal del calendario de inicio (`PanelHomeCalendar`) muestra ese mensaje del servidor en vez
del texto fijo. `ReservasPanel` ya lo muestra.

**Clases grabadas (`/panel/replay`).** Ignora planes vencidos por fecha, igual que
`/api/on-demand/my-lessons` (no usa `isUserPlanUsable`: un plan con desbloqueos agotados sigue
viendo lo ya desbloqueado).

### 4. Admin

Ficha del cliente (`/panel/clientes/[id]`): el badge usa `displayStatus` (Vencido, Sin clases,
Vence pronto en ámbar, Activo en verde, Congelado en azul). Las acciones (congelar/cancelar)
siguen dependiendo del estado guardado.

### 5. Correo "Tu plan vence pronto"

`app/api/cron/plan-expiring` (diario 11:00 UTC): avisa a los planes cuya fecha de vencimiento
(fecha civil en la zona del centro) es exactamente hoy + N días, con
`N = center.planExpiringNoticeDays`. Comparar fechas civiles y no una ventana de horas evita
saltarse o repetir planes si la corrida se atrasa. Se omiten planes sin clases restantes.
Limitación aceptada: si el admin cambia N, un plan puede recibir un segundo aviso (al bajar N) o
ninguno (al subirlo) ese ciclo; no se guarda "aviso enviado".

## Copy

Español chileno con tú, masculino genérico. Fechas con `timeZone` del centro.

## Fuera de alcance (anotado para después)

- Congelar no suma los días congelados a `validUntil`.
- Nada descongela automáticamente al llegar `frozenUntil`.
- Escribir `EXPIRED` en la base de datos (no hace falta: se calcula).

## Pruebas

- Unit: `getPlanDisplayStatus` (cada regla y bordes: justo en `validUntil`, recurrente, ilimitado,
  `noticeDays`), `pickLapsedPlan`, mensaje de reserva con plan vencido / sin clases.
- E2E: alumno con plan vencido (seed con `validUntil` pasado y estado `ACTIVE`) ve "Vencido" y
  "Comprar otro plan" en Planes, y al reservar recibe "Tu plan … venció…". Admin cambia los días
  de aviso en Configuración y se guarda.
