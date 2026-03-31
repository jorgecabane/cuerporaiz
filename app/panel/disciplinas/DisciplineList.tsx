"use client";

import { useState, useTransition } from "react";
import { deleteDiscipline } from "./actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Discipline } from "@/lib/domain";

export function DisciplineList({ disciplines }: { disciplines: Discipline[] }) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("id", deleteTarget.id);
    setDeleteTarget(null);
    startTransition(() => deleteDiscipline(fd));
  }

  return (
    <>
    <ul className="space-y-3">
      {disciplines.map((d) => (
        <li
          key={d.id}
          className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            {d.color && (
              <span
                className="inline-block h-4 w-4 rounded-full border border-[var(--color-border)]"
                style={{ backgroundColor: d.color }}
              />
            )}
            <div>
              <h2 className="font-semibold text-[var(--color-text)]">
                {d.name}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {d.active ? "Activa" : "Inactiva"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              href={`/panel/disciplinas/${d.id}/editar`}
              variant="secondary"
            >
              Editar
            </Button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setDeleteTarget({ id: d.id, name: d.name })}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-error)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] disabled:opacity-50"
            >
              {isPending ? "..." : "Eliminar"}
            </button>
          </div>
        </li>
      ))}
    </ul>
    <ConfirmDialog
      open={deleteTarget !== null}
      title={`¿Eliminar "${deleteTarget?.name}"?`}
      description="Esta disciplina se eliminará permanentemente."
      confirmLabel="Eliminar"
      onConfirm={handleDelete}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
}
