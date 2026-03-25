import { AnimateIn, StaggerList, StaggerItem } from "@/components/ui/AnimateIn";

type DisciplineItem = {
  name: string;
  color: string | null;
};

type DisciplinesSectionProps = {
  title?: string;
  subtitle?: string;
  disciplines: DisciplineItem[];
};

export function DisciplinesSection({
  title,
  subtitle,
  disciplines,
}: DisciplinesSectionProps) {
  if (disciplines.length === 0) return null;

  return (
    <section
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="disciplines-heading"
    >
      <div className="mx-auto max-w-6xl">
        <AnimateIn>
          <h2
            id="disciplines-heading"
            className="text-section font-display font-semibold text-[var(--color-primary)]"
          >
            {title ?? "Nuestras disciplinas"}
          </h2>
        </AnimateIn>

        {subtitle && (
          <AnimateIn delay={0.08}>
            <p className="mt-[var(--space-3)] max-w-2xl text-lg leading-relaxed text-[var(--color-text-muted)]">
              {subtitle}
            </p>
          </AnimateIn>
        )}

        <StaggerList
          stagger={0.08}
          delayChildren={0.15}
          className="mt-[var(--space-12)] flex flex-wrap gap-[var(--space-3)]"
        >
          {disciplines.map((d) => (
            <StaggerItem key={d.name}>
              <span
                className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium text-[var(--color-text)]"
              >
                {d.color && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                    aria-hidden
                  />
                )}
                {d.name}
              </span>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
