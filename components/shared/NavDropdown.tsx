"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { NavGroup } from "@/lib/domain/public-nav";

/** Submenú del header desktop (títulos en NAV_GROUP_LABELS). */
export function NavDropdown({ group, solid }: { group: NavGroup; solid: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors duration-[var(--duration-normal)] hover:text-[var(--color-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)] ${
          solid ? "text-[var(--color-text-muted)]" : "text-white/80"
        }`}
      >
        {group.label}
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform duration-[var(--duration-normal)] ${open ? "rotate-180" : ""}`}
        />
      </button>

      <ul
        id={menuId}
        className={`absolute left-1/2 top-[calc(100%+var(--space-4))] w-72 -translate-x-1/2 origin-top rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-2)] shadow-[var(--shadow-md)] transition-[opacity,transform] duration-[var(--duration-normal)] ease-[cubic-bezier(0.23,1,0.32,1)] ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
      >
        {group.children.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-tertiary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
            >
              {link.label}
              {link.description && (
                <span className="block text-xs text-[var(--color-text-muted)]">{link.description}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
