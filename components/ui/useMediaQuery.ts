"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

/**
 * Hook para detectar si el viewport cumple una media query.
 * SSR-safe: en servidor retorna false (o initialValue si se pasa).
 */
function getMatches(query: string, initialValue: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return initialValue;
  }
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string, initialValue = false): boolean {
  const [matches, setMatches] = useState(() =>
    getMatches(query, initialValue)
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    queueMicrotask(() => setMatches(mql.matches));
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Breakpoint móvil (< 768px). Útil para variant="auto" en AdaptiveSheet.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT, false);
}

/**
 * Detecta si el usuario prefiere reducir movimiento (accesibilidad).
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
