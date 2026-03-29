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
  const isBrowser = typeof document !== "undefined";

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
