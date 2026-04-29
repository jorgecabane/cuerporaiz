"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { SiteLinkPicker } from "@/components/panel/sitio/SiteLinkPicker";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";

type SectionItem = {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  href: string | null;
  order: number;
};

type ItemFormState = {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  href: string;
};

const EMPTY_FORM: ItemFormState = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  href: "",
};

const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";

type Props = {
  sectionId: string;
  sectionKey: string;
};

export default function SectionItemsEditor({ sectionId, sectionKey }: Props) {
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
      href: item.href ?? "",
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
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 space-y-2">
            <div className="h-8 w-full rounded bg-[var(--color-border)]/40" />
            <div className="h-8 w-full rounded bg-[var(--color-border)]/40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Item list */}
      {items.map((item, index) => (
        <div key={item.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          {editingId === item.id ? (
            <div className="p-3 space-y-2 bg-[var(--color-surface)]">
              <ItemForm form={editForm} onChange={setEditForm} sectionKey={sectionKey === "testimonials" && index > 0 ? "testimonials-stat" : sectionKey} />
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
          <ItemForm form={addForm} onChange={setAddForm} sectionKey={sectionKey} />
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

/** Field config per section type */
const FIELD_LABELS: Record<string, {
  title?: string; description?: string; imageUrl?: string; linkUrl?: string;
  extraFields?: { key: string; label: string; type: "text" | "textarea" }[];
}> = {
  team: {
    title: "Nombre",
    description: "Bio",
    imageUrl: "Foto (URL)",
    linkUrl: "Cita / Quote",
    extraFields: [{ key: "tags", label: "Prácticas (separadas por coma)", type: "text" }],
  },
  testimonials: {
    title: "Cita / Testimonio",
    description: "Nombre del autor",
    linkUrl: "Detalle (ej: Retiro Rena-ser)",
  },
  "testimonials-stat": {
    title: "Valor (ej: 2022, 4+)",
    description: "Descripción (ej: Inicio de comunidad)",
  },
  cta: {
    title: "Texto del cuerpo",
    description: "Texto secundario (opcional)",
    linkUrl: "URL de WhatsApp o enlace",
  },
  about: {
    title: "Cita principal",
    description: "Párrafo de cuerpo",
  },
  "how-it-works": {
    title: "Título del paso",
    description: "Descripción del paso",
    linkUrl: "Número y etiqueta (ej: 01|Presencial)",
  },
  "on-demand": {
    title: "Título de la tarjeta",
    description: "Descripción",
    imageUrl: "Imagen (URL)",
    linkUrl: "Etiqueta (ej: Packs online)",
  },
};

/** For team items, split description on --- to separate bio from tags */
function unpackTeamForm(form: ItemFormState): ItemFormState & { tags: string } {
  const parts = form.description.split("\n---\n");
  return { ...form, description: parts[0] ?? "", tags: parts[1] ?? "" };
}

function packTeamForm(form: ItemFormState & { tags: string }): ItemFormState {
  const desc = form.tags
    ? `${form.description}\n---\n${form.tags}`
    : form.description;
  return { ...form, description: desc };
}

function ItemForm({
  form,
  onChange,
  sectionKey,
}: {
  form: ItemFormState;
  onChange: (form: ItemFormState) => void;
  sectionKey: string;
}) {
  const labels = FIELD_LABELS[sectionKey] ?? {};
  const isTeam = sectionKey === "team";
  const teamForm = isTeam ? unpackTeamForm(form) : null;

  function handleChange(field: keyof ItemFormState, value: string) {
    if (isTeam && field === "description") {
      onChange(packTeamForm({ ...teamForm!, description: value }));
    } else {
      onChange({ ...form, [field]: value });
    }
  }

  function handleTagsChange(value: string) {
    if (teamForm) {
      onChange(packTeamForm({ ...teamForm, tags: value }));
    }
  }

  return (
    <div className="space-y-2">
      {/* Title field */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          {labels.title ?? "Título"}
        </label>
        {sectionKey === "testimonials" || sectionKey === "about" ? (
          <textarea
            rows={3}
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className={INPUT_CLASS}
          />
        ) : (
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className={INPUT_CLASS}
          />
        )}
      </div>

      {/* Description field */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          {labels.description ?? "Descripción"}
        </label>
        <textarea
          rows={isTeam ? 4 : 3}
          value={isTeam ? (teamForm?.description ?? "") : form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {/* Tags field (team only) */}
      {isTeam && (
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            Prácticas (separadas por coma)
          </label>
          <input
            type="text"
            value={teamForm?.tags ?? ""}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="Yoga Hatha, Vinyasa, Yin Yoga, ..."
            className={INPUT_CLASS}
          />
        </div>
      )}

      {/* Image picker (hide if no label configured) */}
      {labels.imageUrl !== undefined && (
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            {labels.imageUrl?.replace(/\s*\(URL\)\s*$/, "") ?? "Imagen"}
          </label>
          <SanityImagePicker
            value={form.imageUrl || null}
            onChange={(url) => handleChange("imageUrl", url ?? "")}
            label={labels.imageUrl ?? "Imagen"}
            aspect={sectionKey === "team" ? "portrait" : "square"}
            imageKind={sectionKey === "team" ? "instructor" : "section-item"}
          />
        </div>
      )}

      {/* Link URL field (hide if no label configured) */}
      {labels.linkUrl !== undefined && (
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            {labels.linkUrl}
          </label>
          <input
            type="text"
            value={form.linkUrl}
            onChange={(e) => handleChange("linkUrl", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      )}

      {/* Fallback: show all fields for unknown section types */}
      {!labels.title && (
        <>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">Imagen</label>
            <SanityImagePicker
              value={form.imageUrl || null}
              onChange={(url) => handleChange("imageUrl", url ?? "")}
              label="Imagen"
              aspect="square"
              imageKind="section-item"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">URL de enlace (opcional)</label>
            <input type="text" value={form.linkUrl} onChange={(e) => handleChange("linkUrl", e.target.value)} className={INPUT_CLASS} />
          </div>
        </>
      )}

      {/* Href field — makes the entire card clickable on the public site */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          Link al hacer click (opcional)
        </label>
        <input
          type="text"
          value={form.href}
          onChange={(e) => handleChange("href", e.target.value)}
          placeholder="/#agenda   ·   /planes   ·   https://..."
          className={INPUT_CLASS}
        />
        <div className="mt-1">
          <SiteLinkPicker onPick={(href) => onChange({ ...form, href })} />
        </div>
      </div>
    </div>
  );
}
