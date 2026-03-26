"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import SectionItemsEditor from "./SectionItemsEditor";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero / Portada",
  about: "Propuesta",
  "how-it-works": "Cómo funciona",
  schedule: "Agenda / Horarios",
  plans: "Planes",
  "on-demand": "On Demand",
  disciplines: "Disciplinas",
  team: "Equipo",
  testimonials: "Testimonios",
  cta: "Llamado a la acción",
  contact: "Contacto",
};

const EDITABLE_SECTIONS = new Set(["team", "testimonials", "about", "how-it-works", "on-demand"]);

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
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
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

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Cargando secciones...</p>;
  }

  return (
    <div className="space-y-2">
      {sections.map((section, index) => (
        <div key={section.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
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

            {/* Label */}
            <span className="flex-1 text-sm text-[var(--color-text)]">
              {SECTION_LABELS[section.sectionKey] ?? section.sectionKey}
            </span>

            {/* Edit content button */}
            {EDITABLE_SECTIONS.has(section.sectionKey) && (
              <button
                type="button"
                onClick={() => toggleExpand(section.id)}
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

          {/* Expanded items editor */}
          {expandedId === section.id && (
            <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-bg)]">
              <SectionItemsEditor sectionId={section.id} sectionKey={section.sectionKey} />
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
    </div>
  );
}
