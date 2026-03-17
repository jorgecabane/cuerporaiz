# Diseño: Página de término de checkout (/checkout/gracias)

**Fecha:** 2026-03-13  
**Fase:** 1 del plan maestro Mercado Pago / UX  
**Estado:** Diseño para aprobación

---

## Objetivo

Reestructurar la página que se muestra después del checkout de Mercado Pago (éxito, fallo o pendiente) para que tenga jerarquía visual clara, mensajes apropiados por estado y acciones bien priorizadas, manteniendo el diseño actual del sitio (tokens en `globals.css`, Header y Footer existentes vía `LayoutWithPanel`).

---

## Cascarón público (reutilizable)

Páginas que no son panel ni home usan un **cascarón público**:

- **Rutas:** `/checkout/*`, `/planes`, `/auth/*` (definidas en `LayoutWithPanel` y `Header` como `PUBLIC_SHELL_PATHS`).
- **Header:** siempre sólido (fondo claro, texto oscuro) para buen contraste sobre fondo terciario; no depende del scroll.
- **Estructura:** `min-h-screen` + `main` con `flex-1` para que el contenido ocupe el alto disponible y el **footer quede al final de la página** (no en medio de la pantalla cuando hay poco contenido).
- **Contenido:** cada página envuelve su contenido en `flex-1 flex flex-col bg-[var(--color-tertiary)]` y usa tokens para contraste (primario sobre terciario, texto muted, etc.).

Así `/checkout/gracias` y `/planes` (y login/signup) comparten la misma estructura sin duplicar lógica.

---

## Contexto actual

- **Ruta:** `app/checkout/gracias/page.tsx`
- **Query params:** `result` (success | failure | pending), `order` (externalReference), `centerId`, opcionalmente `payment_id`, `status`
- **Layout:** Cascarón público: Header sólido, main a alto completo, footer al final. Contenido con fondo terciario y bloque centrado (max-w-xl).

---

## Criterios de diseño (alineados al sitio)

- Usar **solo** tokens existentes: `--color-primary`, `--color-success`, `--color-error`, `--color-text`, `--color-text-muted`, `--color-surface`, `--radius-lg`, `--shadow-md`, etc.
- Tipografía: `font-display` (Cormorant Garamond) para títulos, `font-sans` (DM Sans) para cuerpo.
- Sin nuevos colores ni fuentes; sin emojis como iconos (usar Lucide).
- Accesibilidad: contraste mínimo, focus visible, `prefers-reduced-motion` ya cubierto en globals.
- Responsive: 375px, 768px, 1024px.

---

## Propuesta de estructura

### 1. Contenedor principal

- Mantener `<main id="main">` del layout.
- Contenedor interno: `max-w-xl mx-auto px-4 py-12 md:py-16`, alineado con el resto del sitio.

### 2. Tres estados con identidad visual clara

Cada estado (success, failure, pending) tendrá:

- **Icono** (Lucide) arriba del título, con color semántico:
  - Success: `CheckCircle`, color `--color-success`
  - Failure: `XCircle` o `AlertCircle`, color `--color-error`
  - Pending: `Clock`, color `--color-text-muted` o `--color-primary`
- **Título** (h1): `font-display`, tamaño acorde a `text-section` o `text-3xl`, color `--color-primary` (o success/error para el estado).
- **Cuerpo**: uno o dos párrafos con `--color-text-muted`, buen espaciado.
- **Resumen opcional (solo success):** si hay `order` en la URL, resolver la orden (por `externalReference`) para mostrar “Compraste: [nombre del plan]” y el centro, para dar contexto sin salir de la página.

### 3. Acciones (CTAs)

- **Success:**  
  - Primaria: “Ir al panel” (acceso a reservas y contenido).  
  - Secundaria: “Ver mis planes” (enlace a `/planes`).  
  - Terciaria: “Inicio” (link ghost).
- **Failure:**  
  - Primaria: “Ver más planes” (reintentar compra).  
  - Secundaria: “Ir al panel”.  
  - Terciaria: “Inicio”.
- **Pending:**  
  - Primaria: “Ir al panel” (donde más adelante verá el plan cuando se active).  
  - Secundaria: “Ver más planes”.  
  - Terciaria: “Inicio”.

Orden y variantes de botón según ya existentes en `Button` (primary, secondary, ghost).

### 4. Detalle de implementación

- **Iconos:** componentes de Lucide, tamaño ~48px (o equivalente en rem) en desktop, algo menor en móvil.
- **Espaciado:** `space-y-6` entre icono y título, `space-y-4` entre título y cuerpo, `space-y-6` entre cuerpo y el grupo de botones; entre botones `gap-4` (flex wrap).
- **Botones:** mismo componente `Button` y variantes que en el resto del sitio; evitar más de una fila de botones en móvil (apilados o wrap).
- **Resumen success:** bloque opcional debajo del cuerpo, con fondo `--color-surface` y borde/borde suave (`--color-border`), padding estándar, texto “Compraste: [Plan name]” y “Centro: [Center name]” (nombres obtenidos por order → plan + center). Si la orden no se encuentra (ej. aún no llegó el webhook), no mostrar el bloque y dejar solo el mensaje genérico.

### 5. Datos necesarios

- Para el resumen en success: leer `order` de `searchParams`; si existe, llamar a `orderRepository.findByExternalReference(order)` (o equivalente) e incluir `plan` y `center` para mostrar nombre del plan y nombre del centro. Si no hay repositorio expuesto en la page, usar una server action o un fetch interno desde un componente servidor.

---

## Archivos a tocar

- `app/checkout/gracias/page.tsx`: reemplazar contenido con la estructura por estado, iconos, mensajes y CTAs; opcionalmente cargar orden/plan/center para el resumen en success.
- Si hace falta: `lib/adapters/db/order-repository` o API para obtener orden por `externalReference` con relaciones plan y center (o ya existente).

---

## Mensajes de copy (sugeridos)

- **Success:**  
  Título: “¡Pago aprobado!”  
  Cuerpo: “Tu compra fue procesada correctamente. Recibirás la confirmación por email y podés acceder a tu contenido desde el panel.”
- **Failure:**  
  Título: “Pago no realizado”  
  Cuerpo: “El pago fue rechazado o cancelado. Podés intentar de nuevo desde la sección Planes cuando quieras.”
- **Pending:**  
  Título: “Pago pendiente”  
  Cuerpo: “Tu pago está en proceso (por ejemplo, pago en efectivo en un punto de pago). Cuando Mercado Pago lo confirme, actualizaremos tu acceso automáticamente."

---

## Aprobación

Una vez aprobado este diseño, se pasa al plan de implementación (tareas concretas en código).
