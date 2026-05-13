"use client";

import { useCallback } from "react";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

/**
 * Stepper −/+ para cantidad. Funciona igual de bien para 1..10 o 1..200.
 * - Touch target 44x44 (botones) + min-h-[44px] (output).
 * - Botones se deshabilitan en los extremos.
 * - `:active` scale 0.97 para feedback instantáneo (sólo en pointer:fine).
 * - aria-live="polite" en el valor para lectores de pantalla.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  ariaLabel = "Cantidad",
  className = "",
}: Props) {
  const safeMin = Math.max(1, Math.floor(min));
  const safeMax = Math.max(safeMin, Math.floor(max));
  const clamped = Math.min(Math.max(value, safeMin), safeMax);
  const canDecrement = !disabled && clamped > safeMin;
  const canIncrement = !disabled && clamped < safeMax;

  const handleDecrement = useCallback(() => {
    if (canDecrement) onChange(clamped - 1);
  }, [canDecrement, clamped, onChange]);

  const handleIncrement = useCallback(() => {
    if (canIncrement) onChange(clamped + 1);
  }, [canIncrement, clamped, onChange]);

  return (
    <div
      className={`inline-flex items-stretch gap-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label={`Disminuir ${ariaLabel.toLowerCase()}`}
        disabled={!canDecrement}
        onClick={handleDecrement}
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-lg font-medium text-[var(--color-text)] transition-transform duration-[var(--duration-fast)] hover:bg-[var(--color-tertiary)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        −
      </button>
      <output
        aria-live="polite"
        className="flex min-h-[44px] min-w-[3rem] items-center justify-center border-x border-[var(--color-border)] px-[var(--space-3)] text-base font-medium text-[var(--color-text)] tabular-nums"
      >
        {clamped}
      </output>
      <button
        type="button"
        aria-label={`Aumentar ${ariaLabel.toLowerCase()}`}
        disabled={!canIncrement}
        onClick={handleIncrement}
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-lg font-medium text-[var(--color-text)] transition-transform duration-[var(--duration-fast)] hover:bg-[var(--color-tertiary)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        +
      </button>
    </div>
  );
}
