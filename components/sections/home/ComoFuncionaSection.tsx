import { StaggerList, StaggerItem } from "@/components/ui/AnimateIn";
import { AnimateIn } from "@/components/ui/AnimateIn";

const STEPS = [
  {
    num: "01",
    label: "Presencial",
    title: "Clases en la sala",
    description:
      "Reserva tu lugar en Vitacura. Clase suelta o packs de 6, 8 o 12 clases. Un espacio de práctica en comunidad, con guía en cada movimiento.",
  },
  {
    num: "02",
    label: "Online",
    title: "Packs de videos",
    description:
      "Clases grabadas para practicar a tu ritmo y desde donde quieras. Acceso por tiempo definido, con la misma dedicación que en presencial.",
  },
  {
    num: "03",
    label: "Membresía",
    title: "Contenido mes a mes",
    description:
      "Suscripción mensual con material nuevo cada mes. Prácticas, meditaciones y recursos que se acumulan. Sin perder nada del historial.",
  },
] as const;

export function ComoFuncionaSection() {
  return (
    <section
      id="como-funciona"
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="como-funciona-heading"
    >
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <AnimateIn>
          <h2
            id="como-funciona-heading"
            className="text-section font-display font-semibold text-[var(--color-primary)]"
          >
            Tres formas de<br className="hidden sm:block" /> sumarte
          </h2>
        </AnimateIn>

        {/* Pasos */}
        <StaggerList
          stagger={0.14}
          delayChildren={0.15}
          className="mt-[var(--space-16)] divide-y divide-[var(--color-border)]"
        >
          {STEPS.map((step) => (
            <StaggerItem key={step.num}>
              <div className="grid grid-cols-1 gap-[var(--space-4)] py-[var(--space-10)] sm:grid-cols-[auto_1fr] sm:gap-[var(--space-8)] md:grid-cols-[auto_auto_1fr] md:items-start md:gap-[var(--space-12)]">
                {/* Número */}
                <span
                  className="text-numeral font-display font-bold leading-none text-[var(--color-border)] select-none"
                  aria-hidden
                >
                  {step.num}
                </span>

                {/* Label */}
                <div className="hidden flex-col justify-center md:flex">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-secondary)]">
                    {step.label}
                  </span>
                </div>

                {/* Texto */}
                <div>
                  <span className="mb-[var(--space-1)] block text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-secondary)] md:hidden">
                    {step.label}
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-[var(--color-primary)] sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-[var(--space-3)] max-w-lg text-base leading-relaxed text-[var(--color-text-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
