import { AnimateIn, StaggerList, StaggerItem } from "@/components/ui/AnimateIn";

type TestimonialItem = {
  title?: string;
  description?: string;
  linkUrl?: string;
};

type StatItem = {
  value: string;
  label: string;
};

type TestimoniosSectionProps = {
  title?: string;
  items?: TestimonialItem[];
  stats?: StatItem[];
};

const DEFAULT_STATS: StatItem[] = [
  { value: "2022", label: "Inicio de comunidad" },
  { value: "4+", label: "Tipos de práctica" },
  { value: "Online y presencial", label: "Clases a tu ritmo" },
];

export function TestimoniosSection({ title, items, stats }: TestimoniosSectionProps) {
  // First item (sortOrder 0) = testimonial quote
  // Remaining items (sortOrder 1+) = stats (title = value, description = label)
  const quote = items?.[0];
  const itemStats = items && items.length > 1
    ? items.slice(1).map((i) => ({ value: i.title ?? "", label: i.description ?? "" }))
    : null;
  const displayStats = stats ?? itemStats ?? DEFAULT_STATS;
  const quoteText = quote?.title ?? "Sabemos que no fue solo un retiro, fue un espacio de verdad, de contención, de pura expansión. cuerpos respirando juntos, corazones vibrando en la misma sintonía.";
  const quoteAuthor = quote?.description ?? "Comunidad Cuerpo Raíz";
  const quoteDetail = quote?.linkUrl ?? "Retiro Rena-ser";

  return (
    <section
      className="bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-label={title ?? "Comunidad y testimonios"}
    >
      <div className="mx-auto max-w-4xl">
        {/* Cita decorativa */}
        <AnimateIn>
          <span
            className="font-display block text-[7rem] leading-none text-[var(--color-secondary)]/30 select-none md:text-[10rem]"
            aria-hidden
          >
            &ldquo;
          </span>
        </AnimateIn>

        {/* Quote */}
        <AnimateIn delay={0.1}>
          <blockquote className="-mt-[var(--space-8)] md:-mt-[var(--space-12)]">
            <p className="text-quote font-display italic text-white/90 leading-snug">
              {quoteText}
            </p>
            <footer className="mt-[var(--space-6)]">
              <cite className="not-italic">
                <p className="text-sm font-medium text-[var(--color-secondary)]">
                  {quoteAuthor}
                </p>
                <p className="mt-[var(--space-1)] text-sm text-white/50">
                  {quoteDetail}
                </p>
              </cite>
            </footer>
          </blockquote>
        </AnimateIn>

        {/* Separador */}
        <AnimateIn delay={0.2}>
          <div
            className="my-[var(--space-12)] h-px bg-white/10"
            aria-hidden
          />
        </AnimateIn>

        {/* Stats */}
        <StaggerList
          stagger={0.1}
          delayChildren={0.25}
          className="grid grid-cols-3 gap-[var(--space-4)]"
        >
          {displayStats.map((stat, i) => (
            <StaggerItem key={stat.label}>
              <div
                className={`flex flex-col items-center text-center ${
                  i < displayStats.length - 1
                    ? "border-r border-white/10 pr-[var(--space-4)]"
                    : ""
                }`}
              >
                <span className="font-display text-3xl font-bold text-white sm:text-4xl">
                  {stat.value}
                </span>
                <span className="mt-[var(--space-1)] text-xs text-white/50 sm:text-sm">
                  {stat.label}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
