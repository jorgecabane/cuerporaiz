import Link from "next/link";
import { AnimateIn, StaggerList, StaggerItem } from "@/components/ui/AnimateIn";
import { splitParagraphs } from "@/lib/domain/text";

type DisciplineItem = {
  name: string;
  color: string | null;
  /** Frase corta (la misma del calendario). */
  description?: string | null;
  /** Descripción completa, en párrafos. */
  longDescription?: string | null;
};

type DisciplinesSectionProps = {
  title?: string;
  subtitle?: string;
  disciplines: DisciplineItem[];
};

export function DisciplinesSection({ title, subtitle, disciplines }: DisciplinesSectionProps) {
  if (disciplines.length === 0) return null;

  return (
    <section
      id="disciplinas"
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="disciplines-heading"
    >
      <div className="mx-auto max-w-6xl">
        <AnimateIn>
          <h2 id="disciplines-heading" className="text-section font-display font-semibold text-[var(--color-primary)]">
            {title ?? "Nuestras disciplinas"}
          </h2>
        </AnimateIn>

        {subtitle && (
          <AnimateIn delay={0.08}>
            <p className="mt-[var(--space-3)] max-w-2xl text-lg leading-relaxed text-[var(--color-text-muted)]">{subtitle}</p>
          </AnimateIn>
        )}

        <StaggerList stagger={0.08} delayChildren={0.15} className="mt-[var(--space-12)] grid gap-[var(--space-6)] md:grid-cols-2">
          {disciplines.map((d) => (
            <StaggerItem key={d.name}>
              <article className="h-full rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)] md:p-[var(--space-8)]">
                <h3 className="flex items-center gap-[var(--space-3)] font-display text-3xl font-semibold text-[var(--color-primary)]">
                  {d.color && <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />}
                  {d.name}
                </h3>
                {d.description && (
                  <p className="mt-[var(--space-2)] font-display text-xl italic text-[var(--color-secondary)]">{d.description}</p>
                )}
                {splitParagraphs(d.longDescription).map((paragraph) => (
                  <p key={paragraph} className="mt-[var(--space-4)] whitespace-pre-line leading-relaxed text-[var(--color-text-muted)]">
                    {paragraph}
                  </p>
                ))}
              </article>
            </StaggerItem>
          ))}
        </StaggerList>

        <AnimateIn delay={0.2}>
          <Link
            href="/horarios"
            className="mt-[var(--space-10)] inline-flex text-sm font-medium text-[var(--color-secondary)] underline underline-offset-4"
          >
            Ver horarios de las clases →
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}
