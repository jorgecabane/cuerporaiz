"use client";

import { useTransition, useState } from "react";
import {
  createLesson,
  updateLesson,
  deleteLesson,
  archiveLesson,
  unarchiveLesson,
} from "@/app/panel/on-demand/lecciones/actions";
import type { OnDemandCategory, OnDemandPractice, OnDemandLesson, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";
import { SanityImagePicker } from "@/components/panel/SanityImagePicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface LessonFormProps {
  categories: OnDemandCategory[];
  practices: OnDemandPractice[];
  defaultPracticeId?: string;
  lesson?: OnDemandLesson;
  /** Cantidad de LessonUnlock asociadas; solo aplica en modo edit. */
  unlockCount?: number;
}

// El estado ARCHIVED no es elegible desde el dropdown — se llega vía "Eliminar"
// cuando hay canjes, y se sale vía "Des-archivar".
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

export function LessonForm({ categories, practices, defaultPracticeId, lesson, unlockCount = 0 }: LessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isDangerPending, startDangerTransition] = useTransition();
  const [confirmMode, setConfirmMode] = useState<"none" | "delete" | "archive">("none");

  const initialCategoryId = getDefaultCategoryId(practices, defaultPracticeId, lesson?.practiceId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [practiceId, setPracticeId] = useState(lesson?.practiceId ?? defaultPracticeId ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(lesson?.thumbnailUrl ?? null);

  const isArchived = lesson?.status === "ARCHIVED";

  function handleDeleteClick() {
    if (!lesson) return;
    if (unlockCount > 0) setConfirmMode("archive");
    else setConfirmMode("delete");
  }

  function handleConfirmDelete() {
    if (!lesson) return;
    startDangerTransition(async () => {
      const res = await deleteLesson(lesson.id);
      // Si llega aquí es porque la action devolvió `{ ok: false }` (nadie redirigió).
      // En ese caso pasamos a flujo de archivar.
      if (res && res.ok === false && res.reason === "has_unlocks") {
        setConfirmMode("archive");
      }
    });
  }

  function handleConfirmArchive() {
    if (!lesson) return;
    setConfirmMode("none");
    startDangerTransition(() => archiveLesson(lesson.id));
  }

  function handleUnarchive() {
    if (!lesson) return;
    startDangerTransition(() => unarchiveLesson(lesson.id));
  }

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
    <>
      {lesson && (
        <>
          <ConfirmDialog
            open={confirmMode === "delete"}
            title={`¿Eliminar "${lesson.title}"?`}
            description="Nadie ha canjeado esta lección. Se eliminará permanentemente y esta acción no se puede deshacer."
            confirmLabel="Eliminar lección"
            variant="danger"
            loading={isDangerPending}
            onConfirm={handleConfirmDelete}
            onCancel={() => setConfirmMode("none")}
          />
          <ConfirmDialog
            open={confirmMode === "archive"}
            title={`${unlockCount} ${unlockCount === 1 ? "persona" : "personas"} ya canjearon esta lección`}
            description="Si la borras, pierden acceso. Te recomendamos archivarla: deja de aparecer en el catálogo público, pero quien ya la canjeó la sigue viendo en su biblioteca. Podrás des-archivarla cuando quieras."
            confirmLabel="Archivar lección"
            cancelLabel="Cancelar"
            variant="warning"
            loading={isDangerPending}
            onConfirm={handleConfirmArchive}
            onCancel={() => setConfirmMode("none")}
          />
        </>
      )}
    <form action={handleSubmit} className="space-y-4">
      {isArchived && lesson && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-tertiary)]/40 p-3 text-sm">
          <p className="font-medium text-[var(--color-text)]">Lección archivada</p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            No aparece en el catálogo público. {unlockCount > 0 && `${unlockCount} ${unlockCount === 1 ? "persona conserva" : "personas conservan"} acceso.`}
          </p>
          <button
            type="button"
            onClick={handleUnarchive}
            disabled={isDangerPending}
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isDangerPending ? "Procesando…" : "Des-archivar y publicar"}
          </button>
        </div>
      )}
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
          imageKind="lesson"
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || isDangerPending}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : lesson ? "Guardar cambios" : "Crear lección"}
        </button>
        {lesson && !isArchived && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isPending || isDangerPending}
            className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-red-50 disabled:opacity-50"
          >
            {isDangerPending ? "Procesando…" : "Eliminar lección"}
          </button>
        )}
      </div>
    </form>
    </>
  );
}
