"use client";

import { useTransition, useState } from "react";
import { createEvent, updateEvent, deleteEvent } from "@/app/panel/eventos/actions";
import type { Event, EventStatus } from "@/lib/domain/event";
import { EVENT_STATUS_LABELS } from "@/lib/domain/event";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props =
  | { mode: "create" }
  | { mode: "edit"; event: Event };

const STATUS_OPTIONS: EventStatus[] = ["DRAFT", "PUBLISHED", "CANCELLED"];

function toDatetimeLocal(date: Date): string {
  // Format Date as YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent";

const LABEL_CLASS = "block text-sm font-medium text-[var(--color-text)] mb-1";

export function EventForm(props: Props) {
  const isEdit = props.mode === "edit";
  const event = isEdit ? props.event : null;

  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleSubmit(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    if (!title) return;

    const description = (formData.get("description") as string)?.trim() || null;
    const location = (formData.get("location") as string)?.trim() || null;
    const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
    const startsAt = new Date(formData.get("startsAt") as string);
    const endsAt = new Date(formData.get("endsAt") as string);
    const amountCents = parseInt(formData.get("amountCents") as string, 10) || 0;
    const maxCapacityRaw = (formData.get("maxCapacity") as string)?.trim();
    const maxCapacity = maxCapacityRaw ? parseInt(maxCapacityRaw, 10) : null;
    const status = (formData.get("status") as EventStatus) || "DRAFT";
    const color = (formData.get("color") as string)?.trim() || null;

    const data = {
      title,
      description,
      location,
      imageUrl,
      startsAt,
      endsAt,
      amountCents,
      maxCapacity,
      status,
      color,
    };

    if (isEdit && event) {
      startTransition(() => updateEvent(event.id, data));
    } else {
      startTransition(() => createEvent(data));
    }
  }

  function handleDelete() {
    if (!event) return;
    setShowDeleteConfirm(false);
    startDeleteTransition(() => deleteEvent(event.id));
  }

  const idPrefix = isEdit ? "edit-event" : "new-event";
  const formKey = event ? `${event.id}-${event.status}-${event.title}` : "create";

  return (
    <>
      {event && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          title={`¿Eliminar "${event.title}"?`}
          description="Se eliminarán todas las entradas asociadas a este evento. Esta acción no se puede deshacer."
          confirmLabel="Eliminar evento"
          loading={isDeleting}
        />
      )}

      <form key={formKey} action={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label htmlFor={`${idPrefix}-title`} className={LABEL_CLASS}>
            Título <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            required
            defaultValue={event?.title ?? ""}
            className={INPUT_CLASS}
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor={`${idPrefix}-description`} className={LABEL_CLASS}>
            Descripción (opcional)
          </label>
          <textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={3}
            defaultValue={event?.description ?? ""}
            className={INPUT_CLASS}
          />
        </div>

        {/* Ubicación */}
        <div>
          <label htmlFor={`${idPrefix}-location`} className={LABEL_CLASS}>
            Ubicación (opcional)
          </label>
          <input
            id={`${idPrefix}-location`}
            name="location"
            defaultValue={event?.location ?? ""}
            className={INPUT_CLASS}
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${idPrefix}-startsAt`} className={LABEL_CLASS}>
              Fecha inicio <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id={`${idPrefix}-startsAt`}
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={event ? toDatetimeLocal(event.startsAt) : ""}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-endsAt`} className={LABEL_CLASS}>
              Fecha fin <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id={`${idPrefix}-endsAt`}
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={event ? toDatetimeLocal(event.endsAt) : ""}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Precio */}
        <div>
          <label htmlFor={`${idPrefix}-amountCents`} className={LABEL_CLASS}>
            Precio (CLP) — 0 = evento gratis
          </label>
          <input
            id={`${idPrefix}-amountCents`}
            name="amountCents"
            type="number"
            min={0}
            step={1}
            defaultValue={event?.amountCents ?? 0}
            className={INPUT_CLASS}
          />
        </div>

        {/* Capacidad */}
        <div>
          <label htmlFor={`${idPrefix}-maxCapacity`} className={LABEL_CLASS}>
            Capacidad máxima — Dejar vacío = sin límite
          </label>
          <input
            id={`${idPrefix}-maxCapacity`}
            name="maxCapacity"
            type="number"
            min={1}
            step={1}
            defaultValue={event?.maxCapacity ?? ""}
            className={INPUT_CLASS}
          />
        </div>

        {/* Imagen */}
        <div>
          <label htmlFor={`${idPrefix}-imageUrl`} className={LABEL_CLASS}>
            URL de imagen (opcional)
          </label>
          <input
            id={`${idPrefix}-imageUrl`}
            name="imageUrl"
            type="url"
            placeholder="https://"
            defaultValue={event?.imageUrl ?? ""}
            className={INPUT_CLASS}
          />
        </div>

        {/* Color + Estado en fila */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${idPrefix}-color`} className={LABEL_CLASS}>
              Color (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`${idPrefix}-color`}
                name="color"
                type="color"
                defaultValue={event?.color ?? "#2D3B2A"}
                className="h-9 w-14 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                Color representativo del evento
              </span>
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-status`} className={LABEL_CLASS}>
              Estado
            </label>
            <select
              id={`${idPrefix}-status`}
              name="status"
              defaultValue={event?.status ?? "DRAFT"}
              className={INPUT_CLASS}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {EVENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <button
            type="submit"
            disabled={isPending || isDeleting}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isPending
              ? isEdit
                ? "Guardando…"
                : "Creando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear evento"}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending || isDeleting}
              className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-5 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "Eliminando…" : "Eliminar evento"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
