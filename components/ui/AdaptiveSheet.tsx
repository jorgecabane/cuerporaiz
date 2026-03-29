"use client";

import { useEffect, useRef, useId, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile, usePrefersReducedMotion } from "./useMediaQuery";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export type AdaptiveSheetVariant = "auto" | "sheet" | "dialog";

export type AdaptiveSheetMaxHeight =
  | string
  | { mobile?: string; desktop?: string };

export type AdaptiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  variant?: AdaptiveSheetVariant;
  dismissible?: boolean;
  showDragHandle?: boolean;
  maxHeight?: AdaptiveSheetMaxHeight;
};

function getMaxHeight(
  maxHeight: AdaptiveSheetMaxHeight | undefined,
  isMobile: boolean
): string | undefined {
  if (!maxHeight) return undefined;
  if (typeof maxHeight === "string") return maxHeight;
  return isMobile ? maxHeight.mobile : maxHeight.desktop;
}

export function AdaptiveSheet({
  open,
  onOpenChange,
  title,
  children,
  variant = "auto",
  dismissible = true,
  showDragHandle = true,
  maxHeight: maxHeightProp,
}: AdaptiveSheetProps) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  const effectiveVariant: "sheet" | "dialog" =
    variant === "auto" ? (isMobile ? "sheet" : "dialog") : variant;

  const isSheet = effectiveVariant === "sheet";
  const showHandle = isSheet && showDragHandle;

  const maxHeight = getMaxHeight(maxHeightProp, isMobile);
  const sheetHeight = maxHeight ?? "85vh";
  const dialogMaxHeight = maxHeight ?? "80vh";

  const enterDuration = prefersReducedMotion ? 0 : 0.25;
  const exitDuration = prefersReducedMotion ? 0 : 0.15;

  const handleBackdropClick = useCallback(() => {
    if (dismissible) onOpenChange(false);
  }, [dismissible, onOpenChange]);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (!isSheet || !dismissible) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, time: Date.now() };
  }, [isSheet, dismissible]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dy = Math.max(0, e.clientY - dragStartRef.current.y);
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (e.key !== "Tab" || !contentRef.current) return;

      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        FOCUSABLE
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [open, onOpenChange]
  );

  // Focus trap + Esc + body scroll lock
  useEffect(() => {
    if (!open) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousActiveElement.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  // Focus first focusable when opened
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const focusable = contentRef.current.querySelector<HTMLElement>(FOCUSABLE);
    focusable?.focus();
  }, [open]);

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
        >
          {/* Backdrop */}
          <motion.div
            data-testid="adaptive-sheet-backdrop"
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: enterDuration }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={contentRef}
            data-testid="adaptive-sheet-content"
            className="relative z-10 flex w-full flex-col rounded-t-2xl bg-[var(--color-surface)] shadow-[var(--shadow-lg)] sm:max-h-[var(--sheet-dialog-max-h)] sm:max-w-[var(--sheet-dialog-width)] sm:rounded-2xl"
            style={
              {
                "--sheet-dialog-max-h": dialogMaxHeight,
                "--sheet-dialog-width": "min(100% - 2rem, 640px)",
                maxHeight: isSheet ? sheetHeight : undefined,
                height: isSheet ? sheetHeight : "auto",
              } as React.CSSProperties
            }
            initial={
              isSheet
                ? { y: "100%" }
                : { opacity: 0, scale: 0.96 }
            }
            animate={
              isSheet
                ? { y: dragY }
                : { opacity: 1, scale: 1 }
            }
            exit={
              isSheet
                ? { y: "100%" }
                : { opacity: 0, scale: 0.96 }
            }
            transition={{ duration: enterDuration, ease: isSheet ? [0.32, 0.72, 0, 1] : [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
              <div id={titleId} className="min-w-0 flex-1 text-lg font-semibold text-[var(--color-text)]">
                {title}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="shrink-0 rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
