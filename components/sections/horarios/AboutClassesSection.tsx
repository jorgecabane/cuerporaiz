import { AnimateIn } from "@/components/ui/AnimateIn";

export type ClassTypeInfo = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  /** "Lunes y miércoles 08:00" (próximos 7 días), o null si no hay clases esta semana. */
  schedule: string | null;
};

/** "Acerca de las clases": una tarjeta por práctica (sale de /panel/disciplinas). */
export function AboutClassesSection({ classTypes }: { classTypes: ClassTypeInfo[] }) {
  if (classTypes.length === 0) return null;
  return (
    <section
      id="acerca-de-las-clases"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)]"
      aria-labelledby="about-classes-heading"
    >
      <div className="mx-auto max-w-6xl">
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            Acerca de las clases
          </p>
          <h2 id="about-classes-heading" className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]">
            ¿Qué práctica es para ti?
          </h2>
        </AnimateIn>
        <ul className="mt-[var(--space-10)] grid gap-[var(--space-5)] md:grid-cols-2">
          {classTypes.map((c) => (
            <li
              key={c.id}
              className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)]"
            >
              <h3 className="flex items-center gap-[var(--space-2)] font-display text-2xl font-semibold text-[var(--color-primary)]">
                {c.color && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />}
                {c.name}
              </h3>
              {c.description && <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">{c.description}</p>}
              {c.schedule && <p className="mt-[var(--space-3)] text-sm text-[var(--color-text-muted)]">{c.schedule}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
