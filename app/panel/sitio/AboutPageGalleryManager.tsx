"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import {
  ABOUT_IMAGE_CATEGORIES,
  ABOUT_IMAGE_CATEGORY_LABELS,
  type AboutImage,
  type AboutImageCategory,
} from "@/lib/domain/about-page";

interface Props {
  pageId: string;
  images: AboutImage[];
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]";

export default function AboutPageGalleryManager({ pageId, images: initialImages }: Props) {
  const [images, setImages] = useState<AboutImage[]>(initialImages);
  const [activeCategory, setActiveCategory] = useState<AboutImageCategory>("RETIROS");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const filtered = useMemo(
    () =>
      images
        .filter((i) => i.category === activeCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [images, activeCategory],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((i) => i.id === active.id);
    const newIndex = filtered.findIndex((i) => i.id === over.id);
    const newOrdered = arrayMove(filtered, oldIndex, newIndex);

    // Local update first (optimistic)
    setImages((prev) => {
      const others = prev.filter((i) => i.category !== activeCategory);
      const reindexed = newOrdered.map((i, idx) => ({ ...i, sortOrder: idx }));
      return [...others, ...reindexed];
    });

    startTransition(async () => {
      const res = await fetch("/api/panel/about-page/images/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: activeCategory,
          orderedIds: newOrdered.map((i) => i.id),
        }),
      });
      if (!res.ok) {
        setError("No pude guardar el nuevo orden");
        router.refresh();
      }
    });
  }

  async function addImage(formData: FormData) {
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const caption = String(formData.get("caption") ?? "").trim();
    if (!imageUrl) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/panel/about-page/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          caption: caption || null,
          category: activeCategory,
          visible: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No pude agregar la foto");
        return;
      }
      const created: AboutImage = await res.json();
      setImages((prev) => [...prev, created]);
      router.refresh();
    });
  }

  function removeImage(imageId: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/panel/about-page/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("No pude eliminar la foto");
        return;
      }
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      router.refresh();
    });
  }

  function toggleVisible(img: AboutImage) {
    startTransition(async () => {
      const res = await fetch(`/api/panel/about-page/images/${img.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !img.visible }),
      });
      if (!res.ok) return;
      const updated: AboutImage = await res.json();
      setImages((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Galería</h2>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {ABOUT_IMAGE_CATEGORIES.map((cat) => {
          const count = images.filter((i) => i.category === cat).length;
          const selected = cat === activeCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                selected
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {ABOUT_IMAGE_CATEGORY_LABELS[cat]} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addImage(fd);
          e.currentTarget.reset();
        }}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2"
      >
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            name="imageUrl"
            type="url"
            required
            placeholder="URL de la imagen (https://...)"
            className={`${inputCls} md:flex-1`}
          />
          <input
            name="caption"
            placeholder="Caption (opcional)"
            className={`${inputCls} md:w-64`}
            maxLength={280}
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          Las imágenes se agregan a la categoría <strong>{ABOUT_IMAGE_CATEGORY_LABELS[activeCategory]}</strong>.
        </p>
      </form>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}

      {/* Sortable list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No hay fotos en {ABOUT_IMAGE_CATEGORY_LABELS[activeCategory]}. Agrega una arriba.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {filtered.map((img) => (
                <SortableRow
                  key={img.id}
                  image={img}
                  onRemove={() => removeImage(img.id)}
                  onToggle={() => toggleVisible(img)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Hide pageId from UI but keep for a11y */}
      <p className="sr-only">Página: {pageId}</p>
    </section>
  );
}

function SortableRow({
  image,
  onRemove,
  onToggle,
}: {
  image: AboutImage;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
    >
      <button
        type="button"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
        className="cursor-grab text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <GripVertical size={16} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageUrl}
        alt={image.caption ?? ""}
        className="h-12 w-12 shrink-0 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--color-text)]">
          {image.caption || <span className="text-[var(--color-text-muted)]">(sin caption)</span>}
        </p>
        <p className="truncate font-mono text-[10px] text-[var(--color-text-muted)]">
          {image.imageUrl}
        </p>
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-[var(--color-text-muted)]">
        <input
          type="checkbox"
          checked={image.visible}
          onChange={onToggle}
          className="h-3 w-3 accent-[var(--color-primary)]"
        />
        Visible
      </label>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar"
        className="shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error,#dc2626)]"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
