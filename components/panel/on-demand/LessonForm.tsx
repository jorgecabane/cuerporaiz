"use client";

import { useTransition, useState } from "react";
import { createLesson, updateLesson } from "@/app/panel/on-demand/lecciones/actions";
import type { OnDemandCategory, OnDemandPractice, OnDemandLesson, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";

interface LessonFormProps {
  categories: OnDemandCategory[];
  practices: OnDemandPractice[];
  defaultPracticeId?: string;
  lesson?: OnDemandLesson;
}

const STATUS_OPTIONS: OnDemandContentStatus[] = ["DRAFT", "PUBLISHED"];

function getDefaultCategoryId(
  practices: OnDemandPractice[],
  defaultPracticeId?: string,
  lessonPracticeId?: string
): string {
  const practiceId = lessonPracticeId ?? defaultPracticeId;
  if (!practiceId) return "";
  return practices.find((p) => p.id === practiceId)?.categoryId ?? "";
}

export function LessonForm({ categories, practices, defaultPracticeId, lesson }: LessonFormProps) {
  const [isPending, startTransition] = useTransition();

  const initialCategoryId = getDefaultCategoryId(practices, defaultPracticeId, lesson?.practiceId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [practiceId, setPracticeId] = useState(lesson?.practiceId ?? defaultPracticeId ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(lesson?.thumbnailUrl ?? null);

  const filteredPractices = practices.filter((p) => p.categoryId === categoryId);

  function handleCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId);
    setPracticeId("");
  }

  function handleSubmit(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    const videoUrl = (formData.get("videoUrl") as string)?.trim();
    if (!title || !videoUrl || !practiceId) return;

    const description = (formData.get("description") as string)?.trim() || null;
    const promoVideoUrl = (formData.get("promoVideoUrl") as string)?.trim() || null;
    const durationRaw = (formData.get("durationMinutes") as string)?.trim();
    const durationMinutes = durationRaw ? Number(durationRaw) : null;
    const level = (formData.get("level") as string)?.trim() || null;
    const intensity = (formData.get("intensity") as string)?.trim() || null;
    const targetAudience = (formData.get("targetAudience") as string)?.trim() || null;
    const equipment = (formData.get("equipment") as string)?.trim() || null;
    const tags = (formData.get("tags") as string)?.trim() || null;
    const status = (formData.get("status") as OnDemandContentStatus) || "DRAFT";

    if (lesson) {
      startTransition(() =>
        updateLesson(lesson.id, {
          title, videoUrl, description, promoVideoUrl, thumbnailUrl,
          durationMinutes, level, intensity, targetAudience, equipment, tags, status,
        })
      );
    } else {
      startTransition(() =>
        createLesson({
          practiceId, title, videoUrl, description, promoVideoUrl, thumbnailUrl,
          durationMinutes, level, intensity, targetAudience, equipment, tags, status,
        })
      );
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Categoría <span className="text-[var(--color-error)]">*</span>
        </label>
        <select
          id="categoryId"
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">Selecciona una categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="practiceId" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Práctica <span className="text-[var(--color-error)]">*</span>
        </label>
        <select
          id="practiceId"
          value={practiceId}
          onChange={(e) => setPracticeId(e.target.value)}
          required
          disabled={!categoryId}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-50"
        >
          <option value="">Selecciona una práctica</option>
          {filteredPractices.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Título <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={lesson?.title}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          URL del video <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          required
          placeholder="https://"
          defaultValue={lesson?.videoUrl}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Debe comenzar con https://</p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Descripción (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={lesson?.description ?? ""}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div>
        <label htmlFor="promoVideoUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          URL video promo (opcional)
        </label>
        <input
          id="promoVideoUrl"
          name="promoVideoUrl"
          type="url"
          placeholder="https://"
          defaultValue={lesson?.promoVideoUrl ?? ""}
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
          label="Thumbnail de lección"
          aspect="wide"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="durationMinutes" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Duración (minutos)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            placeholder="ej. 45"
            defaultValue={lesson?.durationMinutes ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Nivel (opcional)
          </label>
          <input
            id="level"
            name="level"
            placeholder="ej. Principiante"
            defaultValue={lesson?.level ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="intensity" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Intensidad (opcional)
          </label>
          <input
            id="intensity"
            name="intensity"
            placeholder="ej. Media"
            defaultValue={lesson?.intensity ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div>
          <label htmlFor="targetAudience" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Público objetivo (opcional)
          </label>
          <input
            id="targetAudience"
            name="targetAudience"
            placeholder="ej. Embarazadas"
            defaultValue={lesson?.targetAudience ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="equipment" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Equipamiento necesario (opcional)
        </label>
        <input
          id="equipment"
          name="equipment"
          placeholder="ej. Esterilla, bloque"
          defaultValue={lesson?.equipment ?? ""}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Etiquetas (opcional)
        </label>
        <input
          id="tags"
          name="tags"
          placeholder="ej. respiración,relajación"
          defaultValue={lesson?.tags ?? ""}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Separadas por coma.</p>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Estado
        </label>
        <select
          id="status"
          name="status"
          defaultValue={lesson?.status ?? "DRAFT"}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : lesson ? "Guardar cambios" : "Crear lección"}
        </button>
      </div>
    </form>
  );
}
