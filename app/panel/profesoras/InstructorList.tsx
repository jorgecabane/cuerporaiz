"use client";

import { useTransition } from "react";
import { deactivateInstructor } from "./actions";
import { Button } from "@/components/ui/Button";
import type { Instructor } from "@/lib/ports";

export function InstructorList({ instructors }: { instructors: Instructor[] }) {
  const [isPending, startTransition] = useTransition();

  function handleDeactivate(id: string, name: string | null) {
    if (!window.confirm(`¿Desactivar a la profesora "${name ?? "sin nombre"}"?`)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => deactivateInstructor(fd));
  }

  return (
    <ul className="space-y-3">
      {instructors.map((i) => (
        <li
          key={i.id}
          className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <h2 className="font-semibold text-[var(--color-text)]">
              {i.name ?? "Sin nombre"}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">{i.email}</p>
          </div>
          <div className="flex gap-2">
            <Button
              href={`/panel/profesoras/${i.id}/editar`}
              variant="secondary"
            >
              Editar
            </Button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDeactivate(i.id, i.name)}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-error)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] disabled:opacity-50"
            >
              {isPending ? "..." : "Desactivar"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
