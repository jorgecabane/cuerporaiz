# UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the animation quality, microinteractions, and polish across homepage and panel using Emil Kowalski's design engineering principles.

**Architecture:** Foundation-first approach — new CSS tokens/globals enable all downstream changes. Then components are updated layer-by-layer: shared UI primitives (Button, AnimateIn, AdaptiveSheet), then homepage sections, then panel components. Toast is a new standalone component. Each task produces a working commit.

**Tech Stack:** Next.js 16, React 19, Framer Motion 12, Tailwind CSS 4, CSS custom properties, Vitest

**Spec:** `docs/superpowers/specs/2026-03-28-ui-ux-overhaul-design.md`

---

## File Structure

| File | Responsibility | Task |
|------|---------------|------|
| `app/globals.css` | New easing/motion tokens, global `:active`, hover media query | 1 |
| `components/ui/Button.tsx` | cursor-pointer, explicit transition properties | 2 |
| `components/ui/AnimateIn.tsx` | Faster timing, stronger easing, GPU-accelerated transforms | 3 |
| `components/ui/Toast.tsx` | **New** — Toast store, toast(), Toaster component | 4 |
| `components/ui/Toast.test.tsx` | **New** — Unit tests for Toast | 4 |
| `app/layout.tsx` | Mount `<Toaster />` | 4 |
| `components/ui/AdaptiveSheet.tsx` | Asymmetric timing, drawer easing, drag-to-dismiss | 5 |
| `components/sections/home/HeroSection.tsx` | Faster animations, parallax | 6 |
| `components/shared/Header.tsx` | Explicit transitions, asymmetric mobile menu | 6 |
| `components/sections/home/AgendaSection.tsx` | cursor-pointer, transition cleanup | 7 |
| `components/sections/home/OfertaSection.tsx` | Subtler hover scale | 7 |
| `components/sections/home/SobreTriniSection.tsx` | clip-path image reveal | 7 |
| `components/panel/PanelShell.tsx` | Sidebar nudge, drawer easing, dropdown origin | 8 |
| `app/panel/page.tsx` | Quick access transitions, summary card fade-in | 8 |
| `app/panel/PanelHomeCalendar.tsx` | cursor-pointer, week crossfade, card hover lift | 8 |
| `components/panel/reservas/Tabs.tsx` | Sliding underline animation | 9 |
| `components/panel/reservas/MisReservasSheet.tsx` | Replace inline toast with Toast component | 10 |

---

### Task 1: Foundation — Design Tokens & Motion System

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add new easing curves and motion tokens**

In `app/globals.css`, add these tokens inside the existing `:root` block, after the `--ease-default` line:

```css
  /* Easing curves (Emil Kowalski — stronger than defaults) */
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  /* Press feedback */
  --duration-press: 120ms;
  --scale-press:    0.97;
```

- [ ] **Step 2: Add global `:active` state for pressable elements**

Append after the `/* ─── Focus global` section (after the `:focus-visible` rule):

```css
/* ─── Press feedback (botones responsivos) ──────────────────────────────── */
button:not(:disabled):active,
[data-pressable]:active {
  transform: scale(var(--scale-press));
  transition: transform var(--duration-press) var(--ease-out);
}
```

- [ ] **Step 3: Add touch-safe hover gating utility comment**

Append at end of file:

```css
/* ─── Hover gating: usar dentro de componentes ─────────────────────────── */
/* @media (hover: hover) and (pointer: fine) { ... }                        */
/* Wrap hover animations in this query to prevent false positives on touch. */
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors (CSS-only changes)

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): add stronger easing curves, press feedback tokens, and global :active state"
```

---

### Task 2: Button Component Polish

**Files:**
- Modify: `components/ui/Button.tsx`

- [ ] **Step 1: Update base class string**

Replace the existing `base` const:

```typescript
const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium tracking-wide transition-all duration-[var(--duration-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";
```

With:

```typescript
const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium tracking-wide transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";
```

Changes: added `cursor-pointer`, replaced `transition-all` with explicit properties, changed `duration-normal` (250ms) to `duration-fast` (150ms).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat(ui): add cursor-pointer and explicit transitions to Button"
```

---

### Task 3: AnimateIn — Faster, Stronger, GPU-Accelerated

**Files:**
- Modify: `components/ui/AnimateIn.tsx`

- [ ] **Step 1: Update AnimateIn component**

Replace the entire `AnimateIn` function with:

```tsx
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AnimateIn({
  children,
  delay = 0,
  duration = 0.45,
  direction = "up",
  className = "",
  once = true,
}: AnimateInProps) {
  const initialTransform =
    direction === "up"
      ? "translateY(20px)"
      : direction === "left"
        ? "translateX(-20px)"
        : direction === "right"
          ? "translateX(20px)"
          : "none";

  return (
    <motion.div
      initial={{ opacity: 0, transform: initialTransform }}
      whileInView={{ opacity: 1, transform: "translate(0)" }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Update StaggerItem**

Replace the `StaggerItem` function with:

```tsx
export function StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, transform: "translateY(20px)" },
        visible: {
          opacity: 1,
          transform: "translateY(0)",
          transition: { duration: 0.4, ease: EASE_OUT },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run unit tests**

Run: `npx vitest run`
Expected: All 229 tests pass

- [ ] **Step 5: Commit**

```bash
git add components/ui/AnimateIn.tsx
git commit -m "feat(ui): faster AnimateIn with stronger easing and GPU-accelerated transforms"
```

---

### Task 4: Toast Component (TDD)

**Files:**
- Create: `components/ui/Toast.tsx`
- Create: `components/ui/Toast.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/ui/Toast.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the store logic directly — no DOM rendering needed for core behavior.
// The store is a simple pub/sub with array state.

// Import will be created in step 3
import { toastStore } from "./Toast";

beforeEach(() => {
  toastStore.clear();
});

describe("toastStore", () => {
  it("adds a toast and notifies subscribers", () => {
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);

    toastStore.add({ message: "Hello", variant: "default" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(toastStore.getToasts()).toHaveLength(1);
    expect(toastStore.getToasts()[0].message).toBe("Hello");
    unsub();
  });

  it("removes a toast by id", () => {
    toastStore.add({ message: "A", variant: "default" });
    const id = toastStore.getToasts()[0].id;

    toastStore.remove(id);

    expect(toastStore.getToasts()).toHaveLength(0);
  });

  it("limits visible toasts to 3", () => {
    toastStore.add({ message: "1", variant: "default" });
    toastStore.add({ message: "2", variant: "default" });
    toastStore.add({ message: "3", variant: "default" });
    toastStore.add({ message: "4", variant: "default" });

    expect(toastStore.getToasts()).toHaveLength(4);
    // Toaster component handles visual limiting — store keeps all
  });

  it("clear removes all toasts", () => {
    toastStore.add({ message: "A", variant: "default" });
    toastStore.add({ message: "B", variant: "success" });

    toastStore.clear();

    expect(toastStore.getToasts()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/ui/Toast.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Toast component**

Create `components/ui/Toast.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, Info } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ToastVariant = "default" | "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
};

type AddPayload = { message: string; variant: ToastVariant };

/* ─── Store (framework-agnostic) ─────────────────────────────────────────── */

let toasts: ToastItem[] = [];
let listeners: Array<() => void> = [];
let nextId = 0;

function emit() {
  listeners.forEach((l) => l());
}

export const toastStore = {
  getToasts: () => toasts,
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  add: (payload: AddPayload) => {
    const id = String(++nextId);
    toasts = [...toasts, { ...payload, id, createdAt: Date.now() }];
    emit();
    return id;
  },
  remove: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  clear: () => {
    toasts = [];
    nextId = 0;
    emit();
  },
};

/* ─── Public API ─────────────────────────────────────────────────────────── */

export function toast(message: string) {
  return toastStore.add({ message, variant: "default" });
}
toast.success = (message: string) => toastStore.add({ message, variant: "success" });
toast.error = (message: string) => toastStore.add({ message, variant: "error" });

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

function useToasts() {
  return useSyncExternalStore(toastStore.subscribe, toastStore.getToasts, () => []);
}

/* ─── Single Toast ───────────────────────────────────────────────────────── */

const VARIANT_ICON: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle,
  error: XCircle,
};

const VARIANT_COLOR: Record<ToastVariant, string> = {
  default: "text-[var(--color-text-muted)]",
  success: "text-[var(--color-success)]",
  error: "text-[var(--color-error)]",
};

const AUTO_DISMISS_MS = 4000;
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 0.11;

function ToastCard({
  item,
  index,
  total,
}: {
  item: ToastItem;
  index: number;
  total: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const dragStartRef = useRef<{ x: number; time: number } | null>(null);

  const Icon = VARIANT_ICON[item.variant];
  const iconColor = VARIANT_COLOR[item.variant];

  // Mount animation
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Auto-dismiss with pause on tab blur
  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setDismissing(true);
      setTimeout(() => toastStore.remove(item.id), 200);
    }, AUTO_DISMISS_MS);
  }, [item.id]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    startTimer();
    const onVisibility = () => {
      if (document.hidden) clearTimer();
      else startTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [startTimer, clearTimer]);

  // Swipe-to-dismiss
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, time: Date.now() };
    clearTimer();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    setSwipeX(e.clientX - dragStartRef.current.x);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const distance = Math.abs(e.clientX - dragStartRef.current.x);
    const elapsed = Date.now() - dragStartRef.current.time;
    const velocity = distance / elapsed;

    if (distance >= SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      setDismissing(true);
      setTimeout(() => toastStore.remove(item.id), 200);
    } else {
      setSwipeX(0);
      startTimer();
    }
    dragStartRef.current = null;
  };

  // Stacking: older toasts compress
  const isStacked = index < total - 1;
  const stackOffset = total - 1 - index;
  const stackScale = isStacked ? 1 - stackOffset * 0.05 : 1;
  const stackOpacity = isStacked ? 1 - stackOffset * 0.3 : 1;
  const stackTranslateY = isStacked ? stackOffset * -8 : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-[min(100%-2rem,400px)] touch-pan-y select-none"
      style={{
        transform: `translateX(${swipeX}px) translateY(${mounted && !dismissing ? stackTranslateY : 40}px) scale(${stackScale})`,
        opacity: dismissing ? 0 : mounted ? stackOpacity : 0,
        transition: swipeX !== 0 ? "none" : "transform 300ms cubic-bezier(0.23,1,0.32,1), opacity 200ms ease",
        zIndex: index,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-lg)]">
        <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text)]">
          {item.message}
        </p>
      </div>
    </div>
  );
}

/* ─── Toaster (mount once in layout) ─────────────────────────────────────── */

export function Toaster() {
  const items = useToasts();
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => setIsBrowser(true), []);

  if (!isBrowser) return null;

  const visible = items.slice(-3); // Show last 3

  return createPortal(
    <div
      aria-label="Notificaciones"
      className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 pb-4 pointer-events-none"
    >
      {visible.map((item, i) => (
        <ToastCard key={item.id} item={item} index={i} total={visible.length} />
      ))}
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/ui/Toast.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Add Toaster to root layout**

In `app/layout.tsx`, add import at top:

```typescript
import { Toaster } from "@/components/ui/Toast";
```

Then add `<Toaster />` just before `</body>`:

```tsx
        <LayoutWithPanel footer={<FooterServer />}>{children}</LayoutWithPanel>
        </AuthProvider>
        <Toaster />
      </body>
```

- [ ] **Step 6: Run typecheck and all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add components/ui/Toast.tsx components/ui/Toast.test.tsx app/layout.tsx
git commit -m "feat(ui): add Toast component with swipe-to-dismiss, stacking, and tab-blur pause"
```

---

### Task 5: AdaptiveSheet — Asymmetric Timing & Drag-to-Dismiss

**Files:**
- Modify: `components/ui/AdaptiveSheet.tsx`

- [ ] **Step 1: Add drag state and asymmetric timing**

At the top of the `AdaptiveSheet` function, after the existing state declarations, add:

```tsx
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  const enterDuration = prefersReducedMotion ? 0 : 0.25;
  const exitDuration = prefersReducedMotion ? 0 : 0.15;
```

Replace the existing `const duration = prefersReducedMotion ? 0 : 0.25;` line with the two lines above.

- [ ] **Step 2: Update easing and transition config**

Replace the `transition` prop on the panel `motion.div`:

```tsx
transition={{ duration: enterDuration, ease: isSheet ? [0.32, 0.72, 0, 1] : [0.23, 1, 0.32, 1] }}
```

Update the backdrop transition to use `enterDuration`:

```tsx
transition={{ duration: enterDuration }}
```

- [ ] **Step 3: Add drag-to-dismiss handlers**

Add these functions inside the component, after `handleBackdropClick`:

```tsx
  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (!isSheet || !dismissible) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, time: Date.now() };
  }, [isSheet, dismissible]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dy = Math.max(0, e.clientY - dragStartRef.current.y); // Only drag down
    setDragY(dy);
  }, []);

  const onDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const distance = Math.max(0, e.clientY - dragStartRef.current.y);
    const elapsed = Date.now() - dragStartRef.current.time;
    const velocity = distance / elapsed;

    if (distance > 80 || velocity > 0.11) {
      onOpenChange(false);
    }
    setDragY(0);
    dragStartRef.current = null;
  }, [onOpenChange]);
```

- [ ] **Step 4: Wire drag handlers to the drag handle**

Replace the existing drag handle `<div>` with:

```tsx
{showHandle && (
  <div
    className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing"
    aria-hidden="true"
    onPointerDown={onDragStart}
    onPointerMove={onDragMove}
    onPointerUp={onDragEnd}
  >
    <div
      className="h-1 w-12 rounded-full bg-[var(--color-border)]"
      data-testid="adaptive-sheet-drag-handle"
    />
  </div>
)}
```

- [ ] **Step 5: Apply drag offset to panel transform**

On the panel `motion.div`, add the `style` transform for drag offset. Update the existing `animate` prop for the sheet case:

```tsx
animate={
  isSheet
    ? { y: dragY }
    : { opacity: 1, scale: 1 }
}
```

- [ ] **Step 6: Run existing AdaptiveSheet tests**

Run: `npx vitest run components/ui/AdaptiveSheet.test.tsx`
Expected: All 4 tests pass

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add components/ui/AdaptiveSheet.tsx
git commit -m "feat(ui): add asymmetric sheet timing and drag-to-dismiss with momentum"
```

---

### Task 6: Homepage — Hero & Header Polish

**Files:**
- Modify: `components/sections/home/HeroSection.tsx`
- Modify: `components/shared/Header.tsx`

- [ ] **Step 1: Update HeroSection animation variants**

Replace the `fadeUp` and `fadePlain` consts:

```tsx
const EASE_OUT: readonly [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeUp = {
  hidden: { opacity: 0, transform: "translateY(24px)" },
  visible: {
    opacity: 1,
    transform: "translateY(0)",
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

const fadePlain = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
};
```

- [ ] **Step 2: Add parallax to hero background image**

Add imports at top of HeroSection:

```tsx
import { motion, useScroll, useTransform } from "framer-motion";
```

Remove the existing single `import { motion } from "framer-motion";` line.

Inside the `HeroSection` function, before the return, add:

```tsx
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
```

Add `import { useRef } from "react";` to the react import (it's not imported yet since this is a client component that doesn't use refs currently). Actually, check — `useRef` isn't used. Add it:

```tsx
import { useRef } from "react";
```

Add `ref={sectionRef}` to the `<section>` element.

Replace the background image container `<div className="absolute inset-0" aria-hidden>` with:

```tsx
<motion.div className="absolute inset-0" aria-hidden style={{ y: bgY }}>
```

And close it as `</motion.div>` instead of `</div>`.

- [ ] **Step 3: Update Header transitions**

In `components/shared/Header.tsx`, find the header element's className and replace `transition-all duration-[var(--duration-slow)]` with:

```
transition-[background-color,box-shadow,backdrop-filter] duration-[var(--duration-slow)]
```

Find the mobile menu exit transition and update for asymmetry. In the `<motion.div key="mobile-menu"` element, change:

```tsx
transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
```

to:

```tsx
transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
```

And the `animate` transition (entry) is controlled by framer — for the wrapper, update `initial` and `animate` to include duration:

Actually the `AnimatePresence` handles both enter and exit from the same `transition` prop. To get asymmetric timing, we need to split. Update the motion.div:

```tsx
<motion.div
  key="mobile-menu"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
  exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
  className="fixed inset-0 z-40 flex flex-col bg-[var(--color-primary)] lg:hidden"
>
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/sections/home/HeroSection.tsx components/shared/Header.tsx
git commit -m "feat(ui): faster hero animations with parallax, asymmetric header mobile menu"
```

---

### Task 7: Homepage Sections Polish

**Files:**
- Modify: `components/sections/home/AgendaSection.tsx`
- Modify: `components/sections/home/OfertaSection.tsx`
- Modify: `components/sections/home/SobreTriniSection.tsx`

- [ ] **Step 1: AgendaSection — cursor-pointer and transition cleanup**

In `AgendaSection.tsx`, find the date pill `<button>` className. Add `cursor-pointer` to the class list. Replace any `transition-all` with `transition-[color,background-color,border-color,box-shadow,transform]`.

Find the "Reservar" `<a>` element. Replace `transition-all` with `transition-[color,background-color,border-color,transform]`.

Find the "Ver planes y comprar" `<a>` element. Replace `transition-all` with `transition-[color,background-color,box-shadow,transform]`.

- [ ] **Step 2: OfertaSection — subtler hover scale**

In `OfertaSection.tsx`, find the image `className` with `group-hover:scale-105`. Replace with `group-hover:scale-[1.03]`.

- [ ] **Step 3: SobreTriniSection — clip-path image reveal**

In `SobreTriniSection.tsx`, replace the image `AnimateIn` wrapper. Change:

```tsx
<AnimateIn direction="left">
  <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-xl)] sm:aspect-[4/5]">
```

To:

```tsx
<AnimateIn direction="none">
  <div
    className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-xl)] sm:aspect-[4/5]"
    style={{
      clipPath: "inset(0)",
      transition: "clip-path 0.8s cubic-bezier(0.23, 1, 0.32, 1)",
    }}
  >
```

Note: The clip-path animation is handled by AnimateIn's whileInView triggering the CSS transition. Since AnimateIn wraps with `opacity`, the image fades in AND reveals. For a pure clip-path reveal, we need a different approach. Instead, keep AnimateIn for the fade and add a CSS class:

Actually, simpler — change the AnimateIn direction to `"up"` (default) and add the clip-path as a separate visual enhancement. The AnimateIn already handles the scroll trigger. Let's use a dedicated motion wrapper:

Replace the entire image AnimateIn block:

```tsx
<motion.div
  initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
  whileInView={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
  viewport={{ once: true, margin: "-60px" }}
  transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
>
  <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-xl)] sm:aspect-[4/5]">
    <Image
      src={personImage}
      alt={`${personName} — profesor de yoga y sexólogo`}
      fill
      className="object-cover object-top"
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  </div>
</motion.div>
```

Add `import { motion } from "framer-motion";` at the top (add `"use client";` directive since motion requires it).

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/sections/home/AgendaSection.tsx components/sections/home/OfertaSection.tsx components/sections/home/SobreTriniSection.tsx
git commit -m "feat(ui): homepage section polish — cursor, transitions, clip-path reveal"
```

---

### Task 8: Panel — PanelShell, Home & Calendar

**Files:**
- Modify: `components/panel/PanelShell.tsx`
- Modify: `app/panel/page.tsx`
- Modify: `app/panel/PanelHomeCalendar.tsx`

- [ ] **Step 1: PanelShell sidebar nav nudge**

In `components/panel/PanelShell.tsx`, find the `NavLink` component's className. Replace:

```
transition-colors duration-200
```

With:

```
transition-[color,background-color,transform] duration-200
```

And for the non-active state, add hover translate. Change the non-active class from:

```
text-[var(--color-text)] hover:bg-[var(--color-primary-light)]
```

To:

```
text-[var(--color-text)] hover:bg-[var(--color-primary-light)] hover:translate-x-0.5
```

- [ ] **Step 2: PanelShell admin chevron transition**

Find the admin submenu toggle button with the `ChevronDown` icon. The chevron likely has a rotation class. Find the `ChevronDown` icon and ensure it has:

```
className={`h-4 w-4 shrink-0 transition-transform duration-200 ${adminOpen ? "rotate-180" : ""}`}
```

The `transition-transform duration-200` uses the default ease. Update to use the new ease-out by adding a style:

```tsx
style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
```

- [ ] **Step 3: Panel Home quick access transitions**

In `app/panel/page.tsx`, find the `baseClass` const for quick access items. Replace:

```
transition-colors duration-200
```

With:

```
transition-[color,border-color,box-shadow,transform] duration-150
```

- [ ] **Step 4: PanelHomeCalendar — cursor and week crossfade**

In `app/panel/PanelHomeCalendar.tsx`, find the day selector buttons (inside `WeekDaySelector` component — check if it's in a separate file). If the buttons are in a separate component file, modify there. Add `cursor-pointer` to day selector buttons.

For week crossfade: wrap the day-content section in a `<div key={weekAnchor.toISOString()}>` so React remounts it on week change. Add a CSS animation class:

In `app/globals.css` (already modified in Task 1), add:

```css
/* ─── Week crossfade ────────────────────────────────────────────────────── */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 200ms var(--ease-out);
}
```

Then in PanelHomeCalendar, wrap the class list section with:

```tsx
<div key={weekAnchor.toISOString()} className="animate-fade-in">
  {/* existing class cards */}
</div>
```

- [ ] **Step 5: Apply fade-in to empty states globally**

The `animate-fade-in` class from step 4 also serves spec section 7.1 (empty states). Search the codebase for empty-state patterns (e.g. "No hay clases", "Sin plan activo") and add `className="animate-fade-in"` to their container `<div>`. Key locations:
- `app/panel/PanelHomeCalendar.tsx` — "No hay clases este día" empty card
- `components/panel/reservas/ReservationsList.tsx` — empty reservations message

- [ ] **Step 6: Run typecheck and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add components/panel/PanelShell.tsx app/panel/page.tsx app/panel/PanelHomeCalendar.tsx app/globals.css components/panel/reservas/ReservationsList.tsx
git commit -m "feat(ui): panel polish — sidebar nudge, quick access transitions, week crossfade, empty state fade-in"
```

---

### Task 9: Tabs — Sliding Underline

**Files:**
- Modify: `components/panel/reservas/Tabs.tsx`

- [ ] **Step 1: Add underline tracking to TabsList**

Replace the `TabsList` component:

```tsx
export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { value } = useTabs();
  const containerRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeTab = containerRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    if (activeTab) {
      setUnderlineStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-nowrap gap-0 border-b border-[var(--color-border)] overflow-x-auto ${className}`}
      style={{ scrollbarWidth: "thin" }}
    >
      {children}
      <span
        className="absolute bottom-0 h-0.5 bg-[var(--color-primary)]"
        style={{
          left: underlineStyle.left,
          width: underlineStyle.width,
          transition: "left 200ms cubic-bezier(0.23, 1, 0.32, 1), width 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
    </div>
  );
}
```

Add `useRef` to the imports from React at the top.

- [ ] **Step 2: Remove per-tab border-bottom styling**

In `TabsTrigger`, remove the `borderBottomColor` from the inline style and the `border-b-2` class. Update:

```tsx
const triggerStyle = {
  color: isSelected ? "var(--color-primary)" : "var(--color-text-muted)",
};

return (
  <button
    type="button"
    role="tab"
    id={tabId}
    aria-selected={isSelected}
    aria-controls={"panel-" + value}
    tabIndex={isSelected ? 0 : -1}
    onClick={() => onChange(value)}
    className="min-w-0 shrink-0 rounded-t-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
    style={triggerStyle}
  >
    {children}
  </button>
);
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/panel/reservas/Tabs.tsx
git commit -m "feat(ui): add sliding underline animation to Tabs component"
```

---

### Task 10: Toast Integration — Replace Inline Feedback

**Files:**
- Modify: `components/panel/reservas/MisReservasSheet.tsx`

- [ ] **Step 1: Replace inline toast state with Toast component**

In `MisReservasSheet.tsx`:

Add import at top:
```tsx
import { toast } from "@/components/ui/Toast";
```

Remove the `toast` state and its auto-dismiss effect:
- Remove: `const [toast, setToast] = useState<{ message: string } | null>(null);`
- Remove the `useEffect` block that auto-dismisses toast after 4000ms
- Remove the JSX block that renders the inline toast `<div>` with `role="status"`

Replace all `setToast({ message: ... })` calls with `toast(...)` or `toast.error(...)`:

```tsx
// Line ~147: error case
toast.error(data?.message ?? "Error al cancelar");

// Line ~152: success case
const wasLate = newStatus === "LATE_CANCELLED";
toast(wasLate
  ? "Reserva cancelada. Se descontó 1 clase."
  : "Reserva cancelada correctamente."
);

// Line ~161: catch case
toast.error("Error al cancelar la reserva");
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add components/panel/reservas/MisReservasSheet.tsx
git commit -m "feat(ui): replace MisReservasSheet inline toast with Toast component"
```

---

### Task 11: Final — Run Full Test Suite & E2E

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run unit tests**

Run: `npx vitest run`
Expected: All pass (229+ tests)

- [ ] **Step 3: Run E2E**

Run: `npx playwright test`
Expected: 81+ passed, ≤5 skipped, 0 failed

- [ ] **Step 4: Final commit if any unstaged fixes**

If any files needed small fixes during the test run, stage and commit them.

- [ ] **Step 5: Push branch**

```bash
git push -u origin feature/ui-ux-overhaul
```
