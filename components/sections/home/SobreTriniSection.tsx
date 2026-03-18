import Image from "next/image";
import { AnimateIn } from "@/components/ui/AnimateIn";

const PRACTICES = [
  "Yoga Hatha",
  "Vinyasa",
  "Yin Yoga",
  "Prácticas somáticas",
  "Meditación y respiración",
  "Charlas de sexualidad",
  "Retiros",
] as const;

export function SobreTriniSection() {
  return (
    <section
      id="sobre-trini"
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="sobre-trini-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-[var(--space-12)] md:grid-cols-2 md:items-center md:gap-[var(--space-16)]">
          {/* Imagen */}
          <AnimateIn direction="left">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-xl)] sm:aspect-[4/5]">
              <Image
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80"
                alt="Trinidad Cáceres — profesor de yoga y sexólogo"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </AnimateIn>

          {/* Texto */}
          <div className="flex flex-col gap-[var(--space-6)]">
            <AnimateIn delay={0.1}>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
                Sobre Trini
              </p>
            </AnimateIn>

            <AnimateIn delay={0.18}>
              <h2
                id="sobre-trini-heading"
                className="text-section font-display font-semibold text-[var(--color-primary)]"
              >
                Trinidad Cáceres
              </h2>
            </AnimateIn>

            <AnimateIn delay={0.25}>
              <p className="text-base leading-relaxed text-[var(--color-text-muted)]">
                Profesor de yoga y sexólogo. Combina el movimiento, la
                respiración y la consciencia corporal con una mirada profunda
                sobre el placer y la sensualidad.
              </p>
            </AnimateIn>

            <AnimateIn delay={0.32}>
              <p className="text-base leading-relaxed text-[var(--color-text-muted)]">
                Sus clases son un espacio para que el cuerpo se reordene, se
                reconozca y sane en comunidad — porque hay algo que sucede
                cuando las mujeres se encuentran desde el corazón.
              </p>
            </AnimateIn>

            {/* Pull quote */}
            <AnimateIn delay={0.38}>
              <blockquote className="border-l-2 border-[var(--color-secondary)] pl-[var(--space-5)]">
                <p className="font-display text-xl italic text-[var(--color-secondary)] sm:text-2xl">
                  &ldquo;el cuerpo sana cuando se siente seguro.&rdquo;
                </p>
              </blockquote>
            </AnimateIn>

            {/* Lista de prácticas */}
            <AnimateIn delay={0.44}>
              <ul
                className="flex flex-wrap gap-[var(--space-2)]"
                aria-label="Tipos de práctica"
              >
                {PRACTICES.map((p) => (
                  <li
                    key={p}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-1)] text-xs text-[var(--color-text-muted)]"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </AnimateIn>
          </div>
        </div>
      </div>
    </section>
  );
}
