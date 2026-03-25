import Image from "next/image";
import { AnimateIn, StaggerList, StaggerItem } from "@/components/ui/AnimateIn";
import { Button } from "@/components/ui/Button";
import { CTAS } from "@/lib/constants/copy";

type OfertaSectionProps = {
  title?: string;
  subtitle?: string;
  visible?: boolean;
};

const CARDS = [
  {
    tag: "Packs online",
    title: "Practica a tu ritmo",
    description:
      "Clases grabadas por tipo de práctica — Hatha, Vinyasa, Yin, Somática. Acceso por tiempo definido. La misma dedicación que en una clase presencial.",
    price: "Desde $19.990",
    cta: CTAS.verOpciones,
    href: "/packs",
    variant: "primary" as const,
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    imageAlt: "Práctica de yoga al aire libre en la naturaleza",
  },
  {
    tag: "Membresía",
    title: "Siempre actualizada",
    description:
      "Contenido nuevo cada mes. Prácticas, meditaciones, charlas de sexualidad y bienestar. Acceso a todo el historial mientras estés activa.",
    price: "$15.990 / mes",
    cta: CTAS.verOpciones,
    href: "/membresia",
    variant: "secondary" as const,
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    imageAlt: "Práctica de yoga y meditación a tu ritmo",
  },
] as const;

export function OfertaSection({ title, subtitle, visible }: OfertaSectionProps) {
  // If visible is explicitly false, don't render
  if (visible === false) return null;

  return (
    <section
      id="oferta"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="oferta-heading"
    >
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            {subtitle ?? "Packs y membresía"}
          </p>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <h2
            id="oferta-heading"
            className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
          >
            {title ?? "Elige cómo practicar"}
          </h2>
        </AnimateIn>

        {/* Cards */}
        <StaggerList
          stagger={0.15}
          delayChildren={0.2}
          className="mt-[var(--space-12)] grid gap-[var(--space-6)] sm:grid-cols-2"
        >
          {CARDS.map((card) => (
            <StaggerItem key={card.tag}>
              <article className="group flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-tertiary)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-lg)]">
                {/* Imagen */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.imageAlt}
                    fill
                    className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  {/* Tag sobre imagen */}
                  <span className="absolute left-[var(--space-4)] top-[var(--space-4)] rounded-[var(--radius-sm)] bg-[var(--color-primary)]/90 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white backdrop-blur-sm">
                    {card.tag}
                  </span>
                </div>

                {/* Contenido */}
                <div className="flex flex-1 flex-col p-[var(--space-6)]">
                  <h3 className="font-display text-2xl font-semibold text-[var(--color-primary)]">
                    {card.title}
                  </h3>
                  <p className="mt-[var(--space-3)] flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {card.description}
                  </p>

                  {/* Precio + CTA */}
                  <div className="mt-[var(--space-6)] flex items-center justify-between">
                    <p className="font-display text-lg font-semibold text-[var(--color-primary)]">
                      {card.price}
                    </p>
                    <Button href={card.href} variant={card.variant}>
                      {card.cta}
                    </Button>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
