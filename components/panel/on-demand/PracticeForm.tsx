"use client";

import { useTransition, useState } from "react";
import { createPractice } from "@/app/panel/on-demand/categorias/[id]/actions";
import type { OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";

const STATUS_OPTIONS: OnDemandContentStatus[] = ["DRAFT", "PUBLISHED"];

export function PracticeForm({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;
    const description = (formData.get("description") as string)?.trim() || null;
    const thumbnailUrl = (formData.get("thumbnailUrl") as string)?.trim() || null;
    const status = (formData.get("status") as OnDemandContentStatus) || "DRAFT";
    startTransition(() =>
      createPractice(categoryId, { name, description, thumbnailUrl, status })
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
      >
        Nueva práctica
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Nueva práctica</h2>
      <form action={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="prac-name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Nombre <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="prac-name"
            name="name"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="prac-description" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Descripción (opcional)
          </label>
          <textarea
            id="prac-description"
            name="description"
            rows={2}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="prac-thumbnailUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            URL de imagen (opcional)
          </label>
          <input
            id="prac-thumbnailUrl"
            name="thumbnailUrl"
            type="url"
            placeholder="https://"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Debe comenzar con https://</p>
        </div>
        <div>
          <label htmlFor="prac-status" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Estado
          </label>
          <select
            id="prac-status"
            name="status"
            defaultValue="DRAFT"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Crear práctica"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
