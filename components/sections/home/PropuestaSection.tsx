import { AnimateIn } from "@/components/ui/AnimateIn";

export function PropuestaSection() {
  return (
    <section
      id="propuesta"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="propuesta-heading"
    >
      <div className="mx-auto max-w-3xl">
        {/* Overline */}
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            Yoga con identidad
          </p>
        </AnimateIn>

        {/* Quote grande */}
        <AnimateIn delay={0.12}>
          <blockquote className="mt-[var(--space-6)]">
            <p className="text-quote font-display italic leading-snug text-[var(--color-primary)]">
              &ldquo;hablar de sexualidad también es hablar de cuerpo,
              emociones y bienestar. este espacio nace para abrir
              conversaciones más conscientes, desde el respeto, la educación,
              la conexión y el placer.&rdquo;
            </p>
          </blockquote>
        </AnimateIn>

        {/* Línea separadora */}
        <AnimateIn delay={0.22}>
          <div
            className="my-[var(--space-8)] h-px bg-[var(--color-border)]"
            aria-hidden
          />
        </AnimateIn>

        {/* Párrafo de cuerpo */}
        <AnimateIn delay={0.3}>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-text-muted)]">
            El cuerpo sana cuando se siente seguro. Vinimos a hacerlo en
            compañía, en comunidad. Aquí encontrarás clases para practicar a
            tu ritmo, con la misma dedicación que en una clase presencial.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
