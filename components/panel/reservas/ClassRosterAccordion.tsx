"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";

function rosterInitials(name: string | null, lastName: string | null): string {
  const first = name?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function rosterFullName(name: string | null, lastName: string | null): string {
  return [name, lastName].filter(Boolean).join(" ").trim() || "Alumno";
}

export interface ClassRosterAccordionProps {
  /** Compañeros con reserva confirmada en la clase (ya cargados por el padre). */
  roster: ClassRosterEntryDto[];
}

export function ClassRosterAccordion({ roster }: ClassRosterAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-border)]/30 cursor-pointer"
      >
        <span>Compañeros registrados ({roster.length})</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
      {expanded && (
        <div className="mt-2">
          {roster.length > 0 ? (
            <ul className="space-y-2">
              {roster.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 text-sm">
                  {r.imageUrl ? (
                    <Image
                      src={r.imageUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                      width={28}
                      height={28}
                      unoptimized
                    />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)]"
                      aria-hidden
                    >
                      {rosterInitials(r.name, r.lastName)}
                    </span>
                  )}
                  <span className="text-[var(--color-text)]">{rosterFullName(r.name, r.lastName)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Aún no hay nadie más registrado en esta clase.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
