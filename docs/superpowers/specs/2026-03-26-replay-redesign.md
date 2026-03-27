# Replay — Rediseño UX de la videoteca on demand

**Goal:** Reemplazar la UI actual de accordion anidado (`/panel/on-demand`) por una experiencia tipo Coursera con grid de prácticas, lista de lecciones, y player inline — menos clicks, cuotas visibles, responsive mobile-first.

**Context:** La Fase 3B implementó el backend completo de on demand (modelos, unlock, cuotas, API routes). Esta spec rediseña solo la capa de presentación del estudiante. El admin y las rutas públicas no cambian.

**Depends on:** Fase 3B (On Demand) — ya implementada.

---

## Cambios de Nomenclatura

| Antes | Después |
|-------|---------|
| "Videoteca on demand" | "Replay" |
| `/panel/on-demand` | `/panel/replay` |
| `/panel/on-demand/mis-clases` | Se elimina (integrado en la vista principal) |
| "Desbloquear" | "Canjear clase" |
| Nav item label | "Replay" |

**Rutas admin no cambian:** `/panel/on-demand/categorias` sigue igual (es admin, no estudiante).

---

## Vistas del Estudiante

La sección Replay tiene 3 estados renderizados en una sola ruta `/panel/replay` con shallow routing:

### Vista 1: Grid de Prácticas — `/panel/replay`

Landing page. Muestra todas las prácticas agrupadas por categoría.

**Header:**
- Título "Replay"
- Subtítulo: "Clases grabadas para practicar cuando quieras"

**Banner de cuotas:**
- Chips horizontales con cuota por categoría: "[color dot] Yoga: 3/4" "[color dot] Meditación: 2/2"
- Para MEMBERSHIP_ON_DEMAND: chip único "Acceso ilimitado"
- Para usuarios sin plan: CTA "Compra un plan" → `/panel/tienda`

**Cards de prácticas (por categoría):**
- Título de categoría como heading de sección
- Grid de cards (desktop: 3 columnas, tablet: 2, mobile: stack vertical)
- Cada card muestra:
  - Thumbnail o gradiente de color (izquierda en mobile, arriba en desktop)
  - Nombre de la práctica
  - Conteo: "3 clases"
  - Barra de progreso: desbloqueadas / total
  - Badge "X/Y vistas" si hay lecciones desbloqueadas
- Click en card → Vista 2

**Desktop:** Cards verticales con thumbnail arriba (tipo Coursera).
**Mobile:** Cards horizontales compactas con thumbnail izquierda, info derecha, chevron ›.

### Vista 2: Lecciones de una Práctica — `/panel/replay?practice=[id]`

Muestra las lecciones de la práctica seleccionada.

**Barra superior (sticky):**
- "← Volver" (navega a Vista 1)
- Nombre de la práctica (bold)
- Cuota de la categoría: "Yoga · 3 disponibles para canjear"

**Lista de lecciones (stack vertical):**

Cada card de lección muestra:
- Thumbnail con overlay de duración ("30m") y estado (▶ si desbloqueada, 🔒 si bloqueada)
- Título de la lección
- Metadata: intensidad, equipamiento
- Estado:
  - **Desbloqueada y vista:** "✓ Vista hace 2 días" (verde)
  - **Desbloqueada no vista:** "✓ Desbloqueada" (verde)
  - **Bloqueada con promo:** "Tiene video promocional" (muted)
  - **Bloqueada:** sin texto extra
- Botones de acción:
  - **Desbloqueada:** "Ver clase" (botón primary, full-width en mobile)
  - **Bloqueada con promo:** "Ver adelanto" (secondary) + "Canjear clase" (outline terracota)
  - **Bloqueada sin promo:** "Canjear clase" (outline terracota, full-width)
  - **Sin cuota restante:** "Canjear clase" disabled + tooltip "No tienes clases disponibles"

**"Canjear clase"** abre el modal de confirmación existente (`UnlockModal`), actualizado con el texto "Canjear" en vez de "Desbloquear".

### Vista 3: Player — `/panel/replay?lesson=[id]`

Muestra el video de una lección desbloqueada con metadata completa.

**Navegación:**
- "← Volver a [nombre práctica]" (consistente desktop y mobile)

**Video:**
- Vimeo iframe embed
- Desktop: con padding lateral, max-width
- Mobile: edge-to-edge (sin padding lateral), botón "← Volver" como overlay sobre el video

**Metadata (debajo del video):**
- Título (h1)
- Subtítulo: "[práctica] · [duración] · [intensidad]"
- Tags como chips: nivel, intensidad, equipamiento, tags libres
- Descripción completa

**Navegación "Siguiente en [práctica]":**
- Cards compactas de las otras lecciones de la misma práctica
- Muestran thumbnail mini, título, duración, estado (desbloqueada/bloqueada)
- Click navega al player de esa lección (o abre modal de canjeo si bloqueada)

**URL compartible:** `/panel/replay?lesson=[id]` — si alguien abre esta URL directamente, aterriza en el player (si tiene acceso) o en la vista de lecciones con el video promo (si no tiene acceso).

---

## Lección Bloqueada con Video Promo

Si la lección tiene `promoVideoUrl`:
- En Vista 2: botón "Ver adelanto" que abre el promo inline
- En Vista 3 (llegando por URL directa sin acceso): muestra el promo en lugar del video completo, con CTA "Canjea esta clase para ver el contenido completo"

---

## Componentes

### Nuevos
- `ReplayGrid` — vista principal con cards de prácticas por categoría
- `ReplayPractice` — vista de lecciones de una práctica
- `ReplayPlayer` — vista de player con metadata
- `PracticeCard` — card de práctica (desktop: vertical, mobile: horizontal)
- `ReplayLessonCard` — card de lección con estado y acciones
- `QuotaChips` — chips de cuota por categoría

### Reutilizados
- `VimeoEmbed` — ya existe, sin cambios
- `UnlockModal` — ya existe, actualizar texto "Desbloquear" → "Canjear"

### Eliminados
- `OnDemandCatalog` — reemplazado por ReplayGrid
- `LessonCard` — reemplazado por ReplayLessonCard

---

## Routing

Todo se maneja en `/panel/replay/page.tsx` (server component) con un client component wrapper que maneja el estado de navegación via query params:

```
/panel/replay                    → Vista 1 (Grid)
/panel/replay?practice=[id]      → Vista 2 (Lecciones)
/panel/replay?lesson=[id]        → Vista 3 (Player)
```

Shallow routing con `useRouter().push()` + `useSearchParams()` — sin page reload.

El admin redirect se mantiene: si `isAdminRole` → `/panel/on-demand/categorias`.

---

## Migración de Rutas

- `/panel/on-demand` → redirect 308 a `/panel/replay`
- `/panel/on-demand/mis-clases` → redirect 308 a `/panel/replay`
- Actualizar `lib/panel-nav.ts`: label "Replay", href `/panel/replay`
- Actualizar PanelShell icon mapping (ya existe Play icon)

---

## Responsive Breakpoints

| Viewport | Grid de prácticas | Cards de lección | Player |
|----------|-------------------|------------------|--------|
| Desktop (≥1024px) | 3 columnas, cards verticales | Thumbnail izquierda, botones derecha | Video con padding, max-width |
| Tablet (≥640px) | 2 columnas | Igual que desktop | Video con padding reducido |
| Mobile (<640px) | 1 columna, cards horizontales | Thumbnail izquierda, botones full-width abajo | Video edge-to-edge, volver como overlay |

---

## Data Requirements

La page server component carga:
- Categorías publicadas del centro
- Prácticas publicadas por categoría
- Lecciones publicadas por práctica (con promoVideoUrl)
- UserPlan activo del estudiante (ON_DEMAND o MEMBERSHIP_ON_DEMAND)
- Quota usage por categoría
- Lesson unlocks del usuario
- (Futuro: watch history — no incluido en este scope)

Todo esto ya existe en los repositorios y use cases implementados en Fase 3B.

---

## Scope — Qué NO incluye

- Watch history / tracking de "vista hace X días" (requiere nuevo modelo, se marca como futuro)
- Buscador / filtros dentro de Replay
- Drag & drop para reordenar lecciones (admin ya tiene up/down)
- Cambios a las rutas admin (`/panel/on-demand/categorias/*`)
- Cambios a las rutas públicas (`/catalogo/*`)
- Cambios al modelo de datos o API routes (solo frontend)
