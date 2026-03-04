import { AnimateIn } from "@/components/ui/AnimateIn";
import { Button } from "@/components/ui/Button";
import { CTAS } from "@/lib/constants/copy";


const WHATSAPP_URL =
  "https://wa.me/56900000000?text=Hola%20Trini%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20Cuerpo%20Ra%C3%ADz";

export function CtaSection() {
  return (
    <section
      id="contacto"
      className="bg-[var(--color-secondary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">
            El camino empieza aquí
          </p>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <h2
            id="cta-heading"
            className="mt-[var(--space-4)] text-section font-display font-semibold text-white"
          >
            El camino de regreso a ti.
          </h2>
        </AnimateIn>

        <AnimateIn delay={0.18}>
          <p className="mx-auto mt-[var(--space-5)] max-w-md text-base leading-relaxed text-white/75">
            Elige el formato que se adapte a tu ritmo. Comienza cuando quieras,
            desde donde estés.
          </p>
        </AnimateIn>

        <AnimateIn delay={0.26}>
          <div className="mt-[var(--space-10)] flex flex-wrap justify-center gap-[var(--space-4)]">
            <Button
              href={WHATSAPP_URL}
              variant="light"
              className="!border-white/70 !text-white hover:!bg-white hover:!text-[var(--color-secondary)]"
            >
              {CTAS.hablemos}
            </Button>
            <Button
              href="/#oferta"
              variant="primary"
              className="!bg-white !text-[var(--color-secondary)] hover:!bg-white/90"
            >
              {CTAS.verOpciones}
            </Button>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
