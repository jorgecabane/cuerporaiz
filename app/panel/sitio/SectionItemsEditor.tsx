"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

type SectionItem = {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  order: number;
};

type ItemFormState = {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
};

const EMPTY_FORM: ItemFormState = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
};

const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";

type Props = {
  sectionId: string;
  sectionKey: string;
};

export default function SectionItemsEditor({ sectionId }: Props) {
  const [items, setItems] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(EMPTY_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ItemFormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch(`/api/panel/site-sections/${sectionId}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setError("Error al cargar los elementos"))
      .finally(() => setLoading(false));
  }, [sectionId]);

  function startEdit(item: SectionItem) {
    setEditingId(item.id);
    setEditForm({
      title: item.title ?? "",
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      linkUrl: item.linkUrl ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  function saveEdit(itemId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/panel/site-sections/${sectionId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        setError("Error al guardar los cambios");
        return;
      }
      const updated: SectionItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      setEditingId(null);
    });
  }

  function deleteItem(itemId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/panel/site-sections/${sectionId}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Error al eliminar el elemento");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setConfirmDeleteId(null);
    });
  }

  function addItem() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/panel/site-sections/${sectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        setError("Error al agregar el elemento");
        return;
      }
      const created: SectionItem = await res.json();
      setItems((prev) => [...prev, created]);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    });
  }

  function reorder(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const updated = [...items];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setItems(updated);
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/panel/site-sections/${sectionId}/items/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: updated.map((i) => i.id) }),
      });
      if (!res.ok) {
        setItems(items);
        setError("Error al reordenar los elementos");
      }
    });
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Cargando elementos...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Item list */}
      {items.map((item, index) => (
        <div key={item.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          {editingId === item.id ? (
            <div className="p-3 space-y-2 bg-[var(--color-surface)]">
              <ItemForm form={editForm} onChange={setEditForm} />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => saveEdit(item.id)}
                  className="text-xs font-medium text-white bg-[var(--color-primary)] px-3 py-1 rounded-[var(--radius-md)] disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 px-3 py-3 bg-[var(--color-surface)]">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 pt-0.5">
                <button
                  type="button"
                  aria-label="Mover arriba"
                  disabled={index === 0 || isPending}
                  onClick={() => reorder(index, "up")}
                  className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Mover abajo"
                  disabled={index === items.length - 1 || isPending}
                  onClick={() => reorder(index, "down")}
                  className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Thumbnail */}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title ?? ""}
                  className="h-10 w-10 rounded object-cover shrink-0"
                />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {item.title ?? "(Sin título)"}
                </p>
                {item.description && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{item.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Editar
                </button>
                {confirmDeleteId === item.id ? (
                  <>
                    <span className="text-xs text-[var(--color-text-muted)]">¿Eliminar?</span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-[var(--color-error,#dc2626)] hover:underline disabled:opacity-50"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-[var(--color-text-muted)] hover:underline"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error,#dc2626)]"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {showAddForm ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 space-y-2 bg-[var(--color-surface)]">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Nuevo elemento
          </p>
          <ItemForm form={addForm} onChange={setAddForm} />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={addItem}
              className="text-xs font-medium text-white bg-[var(--color-primary)] px-3 py-1 rounded-[var(--radius-md)] disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          + Agregar elemento
        </button>
      )}

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
    </div>
  );
}

function ItemForm({
  form,
  onChange,
}: {
  form: ItemFormState;
  onChange: (form: ItemFormState) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Título</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Descripción</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">URL de imagen</label>
        <input
          type="text"
          value={form.imageUrl}
          onChange={(e) => onChange({ ...form, imageUrl: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          URL de enlace <span className="text-[var(--color-text-muted)]">(opcional)</span>
        </label>
        <input
          type="text"
          value={form.linkUrl}
          onChange={(e) => onChange({ ...form, linkUrl: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}
