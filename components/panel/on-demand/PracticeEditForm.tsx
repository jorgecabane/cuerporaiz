"use client";

import { useTransition } from "react";
import { updatePractice, deletePractice } from "@/app/panel/on-demand/categorias/[id]/actions";
import type { OnDemandPractice, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";

const STATUS_OPTIONS: OnDemandContentStatus[] = ["DRAFT", "PUBLISHED"];

export function PracticeEditForm({ practice }: { practice: OnDemandPractice }) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleUpdate(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;
    const description = (formData.get("description") as string)?.trim() || null;
    const thumbnailUrl = (formData.get("thumbnailUrl") as string)?.trim() || null;
    const status = (formData.get("status") as OnDemandContentStatus) || "DRAFT";
    startTransition(() =>
      updatePractice(practice.id, practice.categoryId, { name, description, thumbnailUrl, status })
    );
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la práctica "${practice.name}"? Esta acción no se puede deshacer.`)) return;
    startDeleteTransition(() => deletePractice(practice.id, practice.categoryId));
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Editar práctica</h2>
      <form action={handleUpdate} className="space-y-3">
        <div>
          <label htmlFor="edit-prac-name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Nombre <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="edit-prac-name"
            name="name"
            required
            defaultValue={practice.name}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="edit-prac-description" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Descripción (opcional)
          </label>
          <textarea
            id="edit-prac-description"
            name="description"
            rows={2}
            defaultValue={practice.description ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="edit-prac-thumbnailUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            URL de imagen (opcional)
          </label>
          <input
            id="edit-prac-thumbnailUrl"
            name="thumbnailUrl"
            type="url"
            placeholder="https://"
            defaultValue={practice.thumbnailUrl ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="edit-prac-status" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Estado
          </label>
          <select
            id="edit-prac-status"
            name="status"
            defaultValue={practice.status}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? "Eliminando…" : "Eliminar práctica"}
          </button>
        </div>
      </form>
    </div>
  );
}
