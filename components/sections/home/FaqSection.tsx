import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";

export type FaqItem = { question: string; answer: string };

type FaqSectionProps = {
  title?: string;
  subtitle?: string;
  items: FaqItem[];
  /** Si se pasa, muestra solo las primeras N y un link a la página completa. */
  limit?: number;
  headingLevel?: "h1" | "h2";
};

export function FaqSection({ title, subtitle, items, limit, headingLevel = "h2" }: FaqSectionProps) {
  if (items.length === 0) return null;
  const shown = limit ? items.slice(0, limit) : items;
  const hasMore = limit !== undefined && items.length > limit;
  const Heading = headingLevel;

  return (
    <section
      id="preguntas-frecuentes"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            {subtitle ?? "Dudas comunes"}
          </p>
          <Heading
            id="faq-heading"
            className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
          >
            {title ?? "Preguntas frecuentes"}
          </Heading>
        </AnimateIn>

        <div className="mt-[var(--space-12)] divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {shown.map((item) => (
            <details key={item.question} className="group py-[var(--space-5)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-[var(--space-4)] font-medium text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)] [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden
                  className="shrink-0 text-[var(--color-secondary)] transition-transform duration-[var(--duration-normal)] group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-[var(--space-3)] whitespace-pre-line text-base leading-relaxed text-[var(--color-text-muted)]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        {hasMore && (
          <Link
            href="/preguntas-frecuentes"
            className="mt-[var(--space-8)] inline-block text-sm font-medium text-[var(--color-secondary)] underline underline-offset-4"
          >
            Ver todas las preguntas →
          </Link>
        )}
      </div>
    </section>
  );
}
