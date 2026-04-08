"use client";

import { useState, useTransition } from "react";
import { createPractice, updatePractice, deletePractice } from "@/app/panel/on-demand/categorias/[id]/actions";
import type { OnDemandPractice, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props =
  | { mode: "create"; categoryId: string }
  | { mode: "edit"; practice: OnDemandPractice };

const STATUS_OPTIONS: OnDemandContentStatus[] = ["DRAFT", "PUBLISHED"];

export function PracticeForm(props: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEdit = props.mode === "edit";
  const practice = isEdit ? props.practice : null;
  const [status, setStatus] = useState<OnDemandContentStatus>(practice?.status ?? "DRAFT");

  function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;
    const description = (formData.get("description") as string)?.trim() || null;
    const thumbnailUrl = (formData.get("thumbnailUrl") as string)?.trim() || null;
    const status = (formData.get("status") as OnDemandContentStatus) || "DRAFT";
    if (isEdit && practice) {
      startTransition(() =>
        updatePractice(practice.id, practice.categoryId, { name, description, thumbnailUrl, status })
      );
    } else if (!isEdit) {
      startTransition(() =>
        createPractice(props.categoryId, { name, description, thumbnailUrl, status })
      );
    }
  }

  function handleDelete() {
    if (!practice) return;
    setShowDeleteConfirm(false);
    startDeleteTransition(() => deletePractice(practice.id, practice.categoryId));
  }

  if (!isEdit && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
      >
        Nueva práctica
      </button>
    );
  }

  const idPrefix = isEdit ? "edit-prac" : "prac";

  return (
    <>
      {isEdit && practice && (
        <ConfirmDialog
          open={showDeleteConfirm}
          title={`¿Eliminar "${practice.name}"?`}
          description="Se eliminarán todas las lecciones de esta práctica. Esta acción no se puede deshacer."
          confirmLabel="Eliminar práctica"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          {isEdit ? "Editar práctica" : "Nueva práctica"}
        </h2>
        <form action={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor={`${idPrefix}-name`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Nombre <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              name="name"
              required
              defaultValue={practice?.name ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-description`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Descripción (opcional)
            </label>
            <textarea
              id={`${idPrefix}-description`}
              name="description"
              rows={2}
              defaultValue={practice?.description ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-thumbnailUrl`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
              URL de imagen (opcional)
            </label>
            <input
              id={`${idPrefix}-thumbnailUrl`}
              name="thumbnailUrl"
              type="url"
              placeholder="https://"
              defaultValue={practice?.thumbnailUrl ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Debe comenzar con https://</p>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-status`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Estado
            </label>
            <select
              id={`${idPrefix}-status`}
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OnDemandContentStatus)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear práctica"}
              </button>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                >
                  Cancelar
                </button>
              )}
            </div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? "Eliminando…" : "Eliminar práctica"}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
