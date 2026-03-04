import { AnimateIn, StaggerList, StaggerItem } from "@/components/ui/AnimateIn";

const STATS = [
  { value: "2022", label: "Inicio de comunidad" },
  { value: "4+", label: "Tipos de práctica" },
  { value: "Online y presencial", label: "Clases a tu ritmo" },
] as const;

export function TestimoniosSection() {
  return (
    <section
      className="bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-label="Comunidad y testimonios"
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
              Sabemos que no fue solo un retiro, fue un espacio de verdad, de
              contención, de pura expansión. cuerpos respirando juntos,
              corazones vibrando en la misma sintonía.
            </p>
            <footer className="mt-[var(--space-6)]">
              <cite className="not-italic">
                <p className="text-sm font-medium text-[var(--color-secondary)]">
                  Comunidad Cuerpo Raíz
                </p>
                <p className="mt-[var(--space-1)] text-sm text-white/50">
                  Retiro Rena-ser
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
          {STATS.map((stat, i) => (
            <StaggerItem key={stat.label}>
              <div
                className={`flex flex-col items-center text-center ${
                  i < STATS.length - 1
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
