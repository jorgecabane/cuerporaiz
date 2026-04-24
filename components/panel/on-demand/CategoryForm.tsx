"use client";

import { useTransition, useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "@/app/panel/on-demand/categorias/actions";
import type { OnDemandCategory, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";

type Props =
  | { mode: "create" }
  | { mode: "edit"; category: OnDemandCategory };

const STATUS_OPTIONS: OnDemandContentStatus[] = ["DRAFT", "PUBLISHED"];

export function CategoryForm(props: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEdit = props.mode === "edit";
  const category = isEdit ? props.category : null;
  const formKey = category ? `${category.id}-${category.status}-${category.name}` : "create";
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(category?.thumbnailUrl ?? null);

  function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;
    const description = (formData.get("description") as string)?.trim() || null;
    const status = (formData.get("status") as OnDemandContentStatus) || "DRAFT";
    if (isEdit && category) {
      startTransition(() => updateCategory(category.id, { name, description, thumbnailUrl, status }));
    } else {
      startTransition(() => createCategory({ name, description, thumbnailUrl, status }));
    }
  }

  function handleDelete() {
    if (!category) return;
    setShowDeleteConfirm(false);
    startDeleteTransition(() => deleteCategory(category.id));
  }

  // Create mode: show toggle button, then form in card
  if (!isEdit && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
      >
        Nueva categoría
      </button>
    );
  }

  const idPrefix = isEdit ? "edit-cat" : "cat";

  // Edit mode: render only form fields — parent provides InlineEditToggle card wrapper
  if (isEdit) {
    return (
      <>
        {category && (
          <ConfirmDialog
            open={showDeleteConfirm}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            title={`¿Eliminar "${category.name}"?`}
            description="Se eliminarán todas las prácticas y lecciones de esta categoría. Esta acción no se puede deshacer."
            confirmLabel="Eliminar categoría"
            loading={isDeleting}
          />
        )}
        <form key={formKey} action={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor={`${idPrefix}-name`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Nombre <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              name="name"
              required
              defaultValue={category?.name ?? ""}
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
              defaultValue={category?.description ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Imagen (opcional)
            </label>
            <SanityImagePicker
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              label="Thumbnail de categoría"
              aspect="wide"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-status`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Estado
            </label>
            <select
              id={`${idPrefix}-status`}
              name="status"
              defaultValue={category?.status ?? "DRAFT"}
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
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "Eliminando…" : "Eliminar categoría"}
            </button>
          </div>
        </form>
      </>
    );
  }

  // Create mode: card wrapper + form
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Nueva categoría</h2>
      <form key={formKey} action={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={`${idPrefix}-name`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Nombre <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            required
            defaultValue=""
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
            defaultValue=""
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Imagen (opcional)
          </label>
          <SanityImagePicker
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            label="Thumbnail de categoría"
            aspect="wide"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-status`} className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Estado
          </label>
          <select
            id={`${idPrefix}-status`}
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
            {isPending ? "Guardando…" : "Crear categoría"}
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
