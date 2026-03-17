# Diseño: Planes y Mis planes (/planes)

**Fecha:** 2026-03-13  
**Fase:** 2 del plan maestro Mercado Pago / UX  
**Estado:** Diseño para aprobación

---

## Objetivo

Reestructurar la página `/planes` para que (1) el usuario vea **Mis planes** (membresías activas y pasadas) y (2) **Planes para comprar** con más detalle por plan (vigencia, límites de uso), con layout y jerarquía claras y alineadas al diseño actual del sitio. La página ya recibe Header y Footer vía `LayoutWithPanel`; se mejora el contenido y la estructura.

---

## Contexto actual

- **Ruta:** `app/planes/page.tsx`
- **Requisito:** usuario autenticado con `centerId` (redirect a login si no).
- **Datos actuales:** `planRepository.findManyByCenterId(centerId)` — solo planes del centro para comprar. No se listan los `UserPlan` del usuario.
- **Layout:** Contenedor `max-w-2xl`, título “Planes”, descripción, lista de planes con nombre, descripción, precio y botón “Comprar”; botón “Volver al panel”. Sin secciones “Mis planes” ni detalle de vigencia/límites.

---

## Criterios de diseño

- Mismos tokens y tipografía que el resto del sitio (`globals.css`).
- Iconos Lucide, sin emojis.
- Accesibilidad y responsive ya estándar del proyecto.

---

## Propuesta de estructura

### 1. Contenedor y título de página

- Contenedor: `max-w-2xl` (o `max-w-3xl` si se prefiere más aire para las cards), `mx-auto px-4 py-8 md:py-12`.
- Título de página: “Planes” (h1, `font-display`, `text-section`, `--color-primary`).
- Descripción breve: “Gestioná tus membresías y comprá nuevos planes con Mercado Pago.” (o similar), `--color-text-muted`.

### 2. Sección “Mis planes”

- **Ubicación:** Arriba de “Planes para comprar”.
- **Datos:** `userPlanRepository.findByUserAndCenter(session.user.id, session.user.centerId)` — todos los UserPlan del usuario en el centro (activos, vencidos, congelados, cancelados). Incluir relación `plan` para mostrar nombre del plan (y opcionalmente `center` si en el futuro hay multi-centro en la misma vista).
- **Contenido:**
  - Título de sección: “Mis planes” (h2), estilo consistente con el resto del sitio.
  - Si no hay planes: mensaje “Aún no tenés planes. Comprá uno más abajo.” y link o scroll a la sección de planes.
  - Si hay planes: lista de cards (una por UserPlan) con:
    - Nombre del plan (desde `plan.name`).
    - Estado: ACTIVE → “Activo”, EXPIRED → “Vencido”, FROZEN → “Congelado”, CANCELLED → “Cancelado” (usar `USER_PLAN_STATUS_LABELS`).
    - Vigencia: “Válido desde [validFrom] hasta [validUntil]” (formato local corto). Si `validUntil` es null, “Sin vencimiento”.
    - Uso (si aplica): “X de Y clases usadas” cuando `classesTotal` no es null; si es null, “Ilimitado” o “Clases ilimitadas”.
    - Color/borde sutil por estado (activo = borde/acento success, vencido = muted, etc.).
  - Sin acciones por ahora en cada card (en Fase 3 se puede sumar “Ver en Mi cuenta” o similar).

### 3. Sección “Planes para comprar”

- **Título de sección:** “Planes disponibles” (h2).
- **Datos:** mismo que hoy, `planRepository.findManyByCenterId(centerId)`.
- **Vacío:** “Este centro aún no tiene planes publicados.” + botón “Volver al panel”.
- **Cards de plan:** cada ítem con:
  - Nombre (h3).
  - Descripción (si existe).
  - Precio (formato actual con `formatPrice`).
  - **Nuevo — Detalle del plan:**
    - Vigencia: “Válido por X días” si `validityDays`; o “Período [MONTHLY|QUARTERLY|…]” si `validityPeriod` (mapear a copy legible: Mensual, Trimestral, etc.).
    - Límites de uso (si existen): “Máx. X clases en total”, “Máx. X por día”, “Máx. X por semana” (solo mostrar los que no sean null).
  - Botón “Comprar” (mismo `ComprarPlanButton`).
- Misma estética de card que hoy: `rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]`, con buen espaciado entre elementos.

### 4. Navegación

- Al final: “Volver al panel” (Button secondary) como hoy.

### 5. Detalle de implementación

- **UserPlan + Plan:** el repositorio de Prisma ya permite incluir `plan` en `findByUserAndCenter`; verificar si el port `findByUserAndCenter` devuelve el plan o solo IDs. Si no, ampliar el adapter para incluir `plan` (y opcionalmente `center`) y exponer en un DTO o tipo de dominio.
- **Formato de fechas:** `validFrom` y `validUntil` en locale es-AR/es-CL, formato corto (ej. `dd/MM/yyyy` o “15 mar 2026”).
- **Copy de ValidityPeriod:** mapa localizado: MONTHLY → “Mensual”, QUARTERLY → “Trimestral”, etc.
- **Orden de UserPlans:** por ejemplo por `createdAt` desc para ver primero el más reciente; activos primero si se desea (opcional: ordenar por status ACTIVE primero, luego por fecha).

---

## Archivos a tocar

- `app/planes/page.tsx`: añadir carga de UserPlans, sección “Mis planes”, y en cada plan disponible el bloque de detalle (vigencia + límites).
- `lib/adapters/db/user-plan-repository.ts` (o port): si hace falta, método que devuelva UserPlan con `plan` incluido para mostrar nombre y datos del plan en “Mis planes”.
- Posible componente reutilizable `PlanDetail` o texto helper para mostrar vigencia y límites a partir de un `Plan` (usado en la card de “Planes para comprar”).

---

## Resumen de datos

| Sección         | Origen de datos |
|----------------|------------------|
| Mis planes     | `userPlanRepository.findByUserAndCenter(userId, centerId)` con relación `plan` |
| Planes para comprar | `planRepository.findManyByCenterId(centerId)` (ya existe) |

---

## Aprobación

Una vez aprobado, se pasa al plan de implementación (tareas en código).
