# UI/UX Overhaul — Design Spec

**Date:** 2026-03-28
**Branch:** `feature/ui-ux-overhaul` (from `main`)
**Scope:** Homepage + Panel — animations, microinteractions, polish, Toast system

---

## 1. Foundation — Design Tokens & Motion System

### 1.1 New easing curves in `globals.css`

Add stronger easing curves alongside existing `--ease-default` (kept for backwards compat):

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);      /* entries, UI responses */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);     /* on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);      /* sheets/drawers, iOS-like */
```

### 1.2 New motion tokens

```css
--duration-press: 120ms;
--scale-press:    0.97;
```

### 1.3 Global `:active` state for pressable elements

```css
button:not(:disabled):active,
a[role="button"]:active,
[data-pressable]:active {
  transform: scale(var(--scale-press));
  transition: transform var(--duration-press) var(--ease-out);
}
```

### 1.4 Touch-safe hover gating

```css
@media (hover: hover) and (pointer: fine) {
  /* All hover animations go inside this query */
}
```

### 1.5 `REQUIRE_EMAIL_VERIFICATION` env variable

**Deferred** — depends on `feature/auth-hardening` merge (EmailVerificationBanner + `emailVerifiedAt` field don't exist in main yet). Will be added when auth-hardening lands.

---

## 2. Homepage

### 2.1 AnimateIn (`components/ui/AnimateIn.tsx`)

| Property | Before | After |
|----------|--------|-------|
| Default duration | 0.65s | 0.45s |
| Easing | `[0.25, 0.1, 0.25, 1]` | `[0.23, 1, 0.32, 1]` |
| Y offset | 28px | 20px |
| FM `y` prop | `y: 28` (main thread) | `transform: "translateY(20px)"` (GPU) |

StaggerItem: duration 0.55s → 0.4s, same easing change, same GPU fix.

### 2.2 HeroSection (`components/sections/home/HeroSection.tsx`)

- `fadeUp`: duration 0.75s → 0.5s, easing to new ease-out
- `fadePlain`: duration 0.7s → 0.45s
- Add subtle parallax on background image: small `useScroll` + `useTransform` hook, `translateY(calc(scroll * 0.15))`. Only within hero bounds. Gated behind `prefers-reduced-motion`.
- Scroll indicator: unchanged (infinite easeInOut is correct)

### 2.3 Header (`components/shared/Header.tsx`)

- Replace `transition-all` on header element with `transition-property: background-color, box-shadow, backdrop-filter`
- Desktop CTA: add `active:scale-[0.97]`
- Mobile menu enter/exit asymmetry: enter 220ms, exit 150ms
- Mobile menu item stagger: keep current timing (0.1 + 0.07 * i works well)

### 2.4 Section-level improvements

**AgendaSection:**
- Date pills: add `cursor-pointer`, `active:scale-[0.97]`
- "Reservar" links: add `:active` state
- "Ver planes y comprar" CTA: add `:active` state

**OfertaSection:**
- Image hover scale: 1.05 → 1.03 (more subtle/professional)

**SobreTriniSection:**
- Image reveal with `clip-path: inset(0 0 100% 0) → inset(0)` on scroll (replaces simple fade)

**All sections:**
- Replace any remaining `transition-all` with explicit properties

---

## 3. Panel

### 3.1 Email Verification Banner

**Deferred** — `EmailVerificationBanner` component and `emailVerifiedAt` DB field don't exist on main. This will be implemented after `feature/auth-hardening` is merged. See Section 1.5.

### 3.2 PanelShell (`components/panel/PanelShell.tsx`)

- Sidebar nav items: add `translateX(2px)` nudge on hover with `--ease-out`
- Admin submenu chevron: `transition: transform 200ms var(--ease-out)`
- Mobile drawer: use `--ease-drawer` easing, enter 250ms / exit 150ms
- Drawer backdrop: 200ms fade
- User dropdown: set `transform-origin` from avatar button position

### 3.3 Panel Home (`app/panel/page.tsx`)

- Quick access bar buttons: add `active:scale-[0.97]` (inherits from global if using `<button>`, explicit for `<Link>`)
- Replace `transition-colors duration-200` with `transition-property: color, shadow, border-color` + `--duration-fast` + `--ease-out`
- Plan summary card: fade-in on mount (300ms, CSS `@starting-style` or `data-mounted` pattern)

### 3.4 PanelHomeCalendar (`app/panel/PanelHomeCalendar.tsx`)

- Week nav buttons: `:active` state (inherits from global)
- Day selector pills: `cursor-pointer` + `:active` (inherits from global)
- Week transition: crossfade (opacity 0→1 in 200ms) when week changes, using a key-based remount or CSS transition
- Class cards: hover lift `translateY(-1px)` + `shadow-md`, gated behind `@media (hover: hover)`

### 3.5 AdaptiveSheet (`components/ui/AdaptiveSheet.tsx`)

- Sheet (mobile): easing → `--ease-drawer`, enter 250ms, exit 150ms (asymmetric)
- Dialog (desktop): keep scale(0.96) entry, exit 150ms (was 250ms)
- Drag-to-dismiss on mobile: track pointer, calculate velocity (`distance / time`), dismiss if velocity > 0.11 regardless of distance dragged. Use `pointerdown/pointermove/pointerup` with pointer capture.

---

## 4. New Component: Toast

### 4.1 API

```tsx
// Usage anywhere in client components:
import { toast } from "@/components/ui/Toast";

toast("Reserva confirmada");
toast.success("Email enviado");
toast.error("Error al cancelar");

// In layout — render once:
<Toaster />
```

### 4.2 Behavior

- Enter: `translateY(100%) → 0` with CSS transitions (interruptible)
- Stack: up to 3 visible, older ones compress (scale 0.95, opacity 0.7)
- Swipe-to-dismiss: momentum-based (velocity > 0.11 = dismiss)
- Auto-dismiss: 4s default
- Pause timer on tab blur (`document.visibilitychange`)
- Variants: default (neutral), success (green), error (red) — uses design tokens

### 4.3 Styling

- Background: `var(--color-surface)` with `shadow-lg` and border
- Text: `var(--color-text)`, `text-sm font-medium`
- Success icon: `var(--color-success)`
- Error icon: `var(--color-error)`
- Border-radius: `var(--radius-lg)`
- Width: `min(100% - 2rem, 400px)`, centered bottom

### 4.4 Integration (Phase 1 — replace existing inline feedback)

Replace existing inline feedback patterns that already exist:
- `MisReservasSheet`: inline toast → use new Toast component
- Any other existing inline success/error text in sheets
- `EmailVerificationBanner`: deferred until auth-hardening merge

**Phase 2 (separate spec):** Audit all silent flows and add missing toast feedback.

---

## 5. Tabs Underline Animation

### 5.1 Current: border-bottom color transition
### 5.2 New: Sliding underline with clip-path or translateX

- Track active tab position and width
- Animate a `<span>` underline element using `translateX` + `width` (transform-based, GPU)
- Duration: 200ms with `--ease-out`
- Color: `var(--color-primary)`

---

## 6. Button Component (`components/ui/Button.tsx`)

- Add `cursor-pointer` to base class
- Replace `transition-all` with `transition-property: transform, color, background-color, border-color, box-shadow`
- `:active` scale handled by global CSS rule (Section 1.3) — no Tailwind class needed
- Duration: `--duration-fast` (150ms) for color transitions

---

## 7. Global Polish

### 7.1 Empty states
- Add `fade-in` on mount (200ms) — CSS `@starting-style` with `opacity: 0 → 1`

### 7.2 Interactive cards
- Hover: `translateY(-1px)` + shadow elevation, gated behind `@media (hover: hover) and (pointer: fine)`

### 7.3 Performance
- Framer Motion: use `transform: "translateY()"` string instead of `y` shorthand for hardware acceleration in AnimateIn and StaggerItem
- Keep Framer Motion only where `AnimatePresence` is needed (sheets, modals, mobile menu)

### 7.4 Accessibility
- All motion respects existing `prefers-reduced-motion` media query
- Parallax disabled when reduced motion preferred
- Touch hover gating prevents false hover states on mobile

---

## 8. Files Changed (Estimated)

| File | Change Type |
|------|------------|
| `app/globals.css` | Edit — new tokens, global :active, hover media query |
| `components/ui/AnimateIn.tsx` | Edit — timing, easing, GPU optimization |
| `components/ui/Button.tsx` | Edit — cursor, transitions, :active |
| `components/ui/AdaptiveSheet.tsx` | Edit — easing, asymmetric timing, drag-to-dismiss |
| `components/ui/Toast.tsx` | **New** — Toast component + Toaster |
| `components/sections/home/HeroSection.tsx` | Edit — timing, parallax |
| `components/sections/home/AgendaSection.tsx` | Edit — :active, cursor-pointer |
| `components/sections/home/OfertaSection.tsx` | Edit — hover scale reduction |
| `components/sections/home/SobreTriniSection.tsx` | Edit — clip-path image reveal |
| `components/shared/Header.tsx` | Edit — transitions, :active, asymmetric mobile |
| `components/panel/PanelShell.tsx` | Edit — sidebar hover, drawer easing, dropdown origin |
| `components/panel/EmailVerificationBanner.tsx` | **Deferred** — depends on auth-hardening merge |
| `components/panel/reservas/Tabs.tsx` | Edit — sliding underline |
| `app/panel/page.tsx` | Edit — :active on quick access |
| `app/panel/PanelHomeCalendar.tsx` | Edit — transitions, cursor, week crossfade |
| `app/panel/layout.tsx` | No change (banner already absent) |
| `app/layout.tsx` | Edit — add `<Toaster />` |
| `.env.example` | **Deferred** — REQUIRE_EMAIL_VERIFICATION (after auth-hardening) |
| `.env` | **Deferred** — REQUIRE_EMAIL_VERIFICATION (after auth-hardening) |

---

## 9. Out of Scope

- Color palette changes (current "Tierra y cuerpo" palette stays)
- Typography changes (Cormorant Garamond + DM Sans stay)
- Layout/structure changes to pages
- New features or business logic
- Audit of silent flows for Toast integration (Phase 2, separate spec)
- Framer Motion removal (still needed for AnimatePresence)

---

## 10. Testing Strategy

- **Visual**: manual check on 375px, 768px, 1024px, 1440px
- **Accessibility**: verify `prefers-reduced-motion` disables all new animations
- **Performance**: Lighthouse check before/after for animation jank
- **Unit**: Toast component — render, auto-dismiss, swipe-dismiss, stack behavior
- **E2E**: existing tests should pass unchanged (no structural/functional changes)
