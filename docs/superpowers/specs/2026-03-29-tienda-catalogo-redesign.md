# Tienda + Catálogo Redesign — Design Spec

**Date:** 2026-03-29
**Branch:** `feature/tienda-catalogo-redesign` (from `main`)
**Scope:** Redesign `/panel/tienda` pricing cards and `/catalogo` public catalog layout

---

## 1. Tienda (`/panel/tienda`)

### 1.1 Toggle Billing (Stripe-style)

A global toggle at the top of the "Planes disponibles" section switches between "Pago único" and "Mensual":

- **Toggle UI**: pill-shaped segmented control, centered above the plan grid
- **Active segment**: `--color-primary` background, white text
- **Inactive segment**: transparent, `--color-text-muted`
- **Mensual segment**: includes discount badge (e.g., `-15%`) in `--color-secondary`

When toggled:
- **Pago único**: cards show one-time price, button says "Comprar"
- **Mensual**: cards show recurring price with original tachado, button says "Suscribirme"
- Plans that only support one billing mode (e.g., `billingMode === "ONE_TIME"`) show their price regardless of toggle, button matches their mode
- Plans with `billingMode === "BOTH"` react to the toggle

### 1.2 Plan Card Design

Each card contains (top to bottom):
1. **Type badge** (pill): "EN VIVO", "ON DEMAND", or "MEMBRESÍA" — `--color-primary` bg
2. **Popular badge** (optional, pill): `--color-secondary` bg — shown for the highlighted plan
3. **Plan name**: `text-xl font-semibold`, `--color-primary`
4. **Description**: `text-sm`, `--color-text-muted` — one line
5. **Price block**:
   - Active price: `text-3xl font-bold`, `--color-primary`
   - Price suffix: "/mes" or "pago único" — `text-sm`, `--color-text-muted`
   - Strikethrough original (when mensual toggle active): `text-sm line-through`, `--color-text-muted`
6. **Features list** in subtle box (`--color-tertiary` bg, `--radius-md`):
   - "✓ Máx. N clases por día" (if `maxReservationsPerDay`)
   - "✓ Máx. N por semana" (if `maxReservationsPerWeek`)
   - "✓ Válido N días" or "✓ Se renueva automáticamente" (depending on toggle)
   - "✓ Clases ilimitadas" (if `maxReservations` is null)
7. **CTA button**: full-width, `--color-primary` bg

**Card highlighted (popular)**: `border-2 border-[--color-primary]` instead of default `border border-[--color-border]`

### 1.3 Plan Groups

Plans grouped by type with section headers:

```
EN VIVO
Clases presenciales y online en vivo
[grid of plan cards]

ON DEMAND
Clases grabadas a tu ritmo
[grid of plan cards]

MEMBRESÍA
Acceso a todo el contenido grabado
[grid of plan cards]
```

- Header: `text-xs uppercase tracking-widest`, `--color-text-muted`
- Subheader: `text-sm`, `--color-text-muted`
- Grid: `sm:grid-cols-2` (1 col mobile, 2 col desktop)
- Empty groups are not rendered
- Group order: LIVE → ON_DEMAND → MEMBERSHIP_ON_DEMAND

### 1.4 Mis Planes Section

Keep current tabs (Activos / Históricos) — already works well. No changes.

---

## 2. Catálogo (`/catalogo`)

### 2.1 Dark Hero Header

Compact hero section at top to give contrast for the fixed transparent header:

- Background: `--color-primary` (solid, no image)
- Height: ~200px (enough for header clearance + content)
- Padding-top: `--header-height` + extra space
- Title: "Catálogo on demand" — `text-section font-display`, white
- Subtitle: "Practica a tu ritmo con clases grabadas" — `text-base`, white/70
- CTA button (optional): "Ver planes" → `/panel/tienda`, variant `light`

### 2.2 Netflix Rows Layout

Below the hero, each published category renders as a horizontal row:

**Row structure:**
1. **Row header**: flex between
   - Left: category name — `text-lg font-semibold`, `--color-primary`
   - Right: "Ver todo →" — `text-sm font-medium`, `--color-secondary`, links to `/catalogo/[categoryId]`
2. **Horizontal scroll container**: `overflow-x: auto`, `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`, hide scrollbar
3. **Lesson/Practice cards** inside the scroll:
   - Fixed width: `min-w-[160px] sm:min-w-[200px]`
   - `scroll-snap-align: start`
   - Thumbnail: `aspect-[16/10]`, rounded top, `object-cover`
   - Below thumbnail: practice/lesson name (`text-sm font-semibold`), metadata line (duration + level, `text-xs --color-text-muted`)
   - Border: `border border-[--color-border]`, `rounded-[--radius-lg]`
   - Background: `--color-surface`

**What to show in rows:**
- Each row = one category
- Cards in the row = practices within that category
- Each practice card shows: thumbnail (or gradient fallback), practice name, lesson count + duration range
- Clicking a practice card → `/catalogo/[categoryId]` (or `/catalogo/[categoryId]/[practiceId]` if we want direct deep link)

**Empty state**: If no categories published, show centered message "Aún no hay contenido disponible" with CTA to tienda.

### 2.3 Category Detail Page (`/catalogo/[categoryId]`)

Keep current structure but apply consistent styling:
- Same dark hero header (shorter, with breadcrumb)
- Practice cards in grid (2 columns)

### 2.4 Practice Detail Page (`/catalogo/[categoryId]/[practiceId]`)

Keep current structure. No changes needed.

---

## 3. Bug Fix: SobreTrini Image on Mobile

### Problem
The `clipPath: "inset(0 0 100% 0)"` animation on the image `motion.div` doesn't trigger on mobile because the IntersectionObserver with `margin: "-60px"` doesn't detect the fully-clipped element on small viewports.

### Fix
Remove the negative viewport margin for this specific animation, or change to `margin: "0px"`. The `clipPath` initial state (`inset(0 0 100% 0)`) makes the element have zero visible height, so the observer needs a more generous trigger area on mobile.

Change in `SobreTriniSection.tsx`:
```tsx
viewport={{ once: true, margin: "0px" }}
```

This ensures the animation triggers as soon as the element enters the viewport, even on mobile where the element starts fully clipped.

---

## 4. Files Changed (Estimated)

| File | Change Type |
|------|------------|
| `app/panel/tienda/page.tsx` | **Rewrite** — toggle billing, new card design, group headers |
| `app/planes/ComprarPlanButton.tsx` | Minor — may need style adjustments |
| `app/planes/SuscribirmeButton.tsx` | Minor — may need style adjustments |
| `app/catalogo/page.tsx` | **Rewrite** — dark hero + Netflix rows layout |
| `app/catalogo/[categoryId]/page.tsx` | Edit — add dark hero header with breadcrumb |
| `components/sections/home/SobreTriniSection.tsx` | Edit — fix viewport margin for mobile |

---

## 5. Out of Scope

- Checkout/payment flow logic (only UI changes)
- Data model changes
- Replay panel redesign
- Practice/Lesson detail page redesign
- Adding new API endpoints

---

## 6. Testing Strategy

- **Visual**: manual check at 375px, 768px, 1024px, 1440px
- **Toggle**: verify billing toggle changes price/button on all cards correctly
- **Scroll**: verify horizontal scroll works on mobile (touch) and desktop (mousewheel/trackpad)
- **E2E**: existing tests should pass (no structural route changes)
- **Accessibility**: toggle is keyboard-navigable, cards have proper aria labels
