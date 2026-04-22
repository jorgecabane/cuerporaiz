"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronUp, ChevronDown, Pencil } from "lucide-react";
import SectionItemsEditor from "./SectionItemsEditor";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero / Portada",
  about: "Propuesta",
  "how-it-works": "Cómo funciona",
  schedule: "Agenda / Horarios",
  plans: "Planes",
  "on-demand": "Biblioteca virtual",
  events: "Próximos eventos",
  disciplines: "Disciplinas",
  team: "Equipo",
  testimonials: "Testimonios",
  cta: "Llamado a la acción",
  contact: "Contacto",
};

/** Sections that have editable sub-items */
const HAS_ITEMS_SECTIONS = new Set(["team", "testimonials", "about", "how-it-works", "cta"]);

/** Sections where title/subtitle can be edited inline (most sections) */
const HAS_TITLE_SECTIONS = new Set([
  "about", "how-it-works", "schedule", "plans", "on-demand", "events",
  "disciplines", "team", "testimonials", "cta",
]);

const INPUT_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)]";

type Section = {
  id: string;
  sectionKey: string;
  visible: boolean;
  sortOrder: number;
  title: string | null;
  subtitle: string | null;
  items: unknown[];
};

export default function SectionsManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleForm, setTitleForm] = useState({ title: "", subtitle: "" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/panel/site-sections")
      .then((res) => res.json())
      .then((data) => setSections(data))
      .catch(() => setError("Error al cargar las secciones"))
      .finally(() => setLoading(false));
  }, []);

  function toggleVisible(section: Section) {
    const newValue = !section.visible;
    setSections((prev) =>
      prev.map((s) => (s.id === section.id ? { ...s, visible: newValue } : s))
    );
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/panel/site-sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: newValue }),
      });
      if (!res.ok) {
        setSections((prev) =>
          prev.map((s) => (s.id === section.id ? { ...s, visible: !newValue } : s))
        );
        setError("Error al guardar el cambio");
      }
    });
  }

  function reorder(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;

    const updated = [...sections];
    [updated[index], updated[swapIndex]] = [updated[swapIndex]!, updated[index]!];
    setSections(updated);
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/panel/site-sections/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: updated.map((s) => s.id) }),
      });
      if (!res.ok) {
        setSections(sections);
        setError("Error al reordenar las secciones");
      }
    });
  }

  function startEditTitle(section: Section) {
    setEditingTitleId(section.id);
    setTitleForm({
      title: section.title ?? "",
      subtitle: section.subtitle ?? "",
    });
  }

  function saveTitle(sectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/panel/site-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleForm.title || null,
          subtitle: titleForm.subtitle || null,
        }),
      });
      if (!res.ok) {
        setError("Error al guardar");
        return;
      }
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, title: titleForm.title || null, subtitle: titleForm.subtitle || null }
            : s
        )
      );
      setEditingTitleId(null);
    });
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)]">
              <div className="h-5 w-9 rounded-full bg-[var(--color-border)]/40 shrink-0" />
              <div className="h-3.5 flex-1 max-w-[160px] rounded bg-[var(--color-border)]/40" />
              <div className="ml-auto h-4 w-4 rounded bg-[var(--color-border)]/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map((section, index) => (
        <div key={section.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)]">
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5">
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
                disabled={index === sections.length - 1 || isPending}
                onClick={() => reorder(index, "down")}
                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Label + current title/subtitle preview */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[var(--color-text)]">
                {SECTION_LABELS[section.sectionKey] ?? section.sectionKey}
              </span>
              {section.title && (
                <span className="ml-2 text-xs text-[var(--color-text-muted)] truncate">
                  — {section.title}
                </span>
              )}
            </div>

            {/* Edit title button */}
            {section.sectionKey === "hero" ? (
              <a
                href="?tab=branding"
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Editar en Marca
              </a>
            ) : HAS_TITLE_SECTIONS.has(section.sectionKey) ? (
              <button
                type="button"
                onClick={() => startEditTitle(section)}
                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                title="Editar título y subtítulo"
              >
                <Pencil size={14} />
              </button>
            ) : null}

            {/* Edit items button */}
            {HAS_ITEMS_SECTIONS.has(section.sectionKey) && (
              <button
                type="button"
                onClick={() => setExpandedId((prev) => (prev === section.id ? null : section.id))}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                {expandedId === section.id ? "Cerrar" : "Editar contenido"}
              </button>
            )}

            {/* Visible toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={section.visible}
              disabled={isPending}
              onClick={() => toggleVisible(section)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                section.visible ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
              } disabled:opacity-50`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                  section.visible ? "translate-x-4 ml-0.5" : "translate-x-0 ml-0.5"
                }`}
              />
            </button>
          </div>

          {/* Inline title/subtitle editor */}
          {editingTitleId === section.id && (
            <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)] space-y-2">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Título de la sección</label>
                <input
                  type="text"
                  value={titleForm.title}
                  onChange={(e) => setTitleForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Reserva tu lugar"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Subtítulo / overline</label>
                <input
                  type="text"
                  value={titleForm.subtitle}
                  onChange={(e) => setTitleForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Ej: Presencial — Vitacura"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingTitleId(null)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => saveTitle(section.id)}
                  className="text-xs font-medium text-white bg-[var(--color-primary)] px-3 py-1 rounded-[var(--radius-md)] disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* Expanded items editor */}
          {expandedId === section.id && (
            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <SectionItemsEditor sectionId={section.id} sectionKey={section.sectionKey} />
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
    </div>
  );
}
