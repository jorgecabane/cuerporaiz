import Image from "next/image";
import Link from "next/link";

const HIGHLIGHTS = [
  "Hatha, vinyasa, yin y somática",
  "Prácticas cortas (15 min) y completas (60 min)",
  "Meditaciones y charlas de bienestar",
  "Nuevo contenido cada mes",
];

const MAIN_IMG =
  "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=1200&q=80";

export function VariantCEditorial() {
  return (
    <section
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="mock-lib-editorial-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-[var(--space-12)] md:grid-cols-[1fr_1fr] md:gap-[var(--space-16)]">
        {/* Image column with editorial overlap */}
        <div className="relative order-2 md:order-1">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]">
            <Image
              src={MAIN_IMG}
              alt="Práctica de yoga en casa con luz natural"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {/* Floating stat card */}
          <div className="absolute -bottom-[var(--space-6)] -right-[var(--space-4)] hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-5)] shadow-[var(--shadow-lg)] md:block">
            <p className="font-display text-3xl font-semibold text-[var(--color-primary)]">
              +50
            </p>
            <p className="mt-[var(--space-1)] text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              clases grabadas
            </p>
          </div>
          {/* Floating teacher card */}
          <div className="absolute -left-[var(--space-4)] -top-[var(--space-4)] hidden rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-white shadow-[var(--shadow-md)] md:block">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              nuevo esta semana
            </p>
            <p className="mt-[var(--space-1)] font-display text-base font-medium">
              Meditación al amanecer
            </p>
          </div>
        </div>

        {/* Text column */}
        <div className="order-1 md:order-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            Biblioteca virtual
          </p>
          <h2
            id="mock-lib-editorial-heading"
            className="mt-[var(--space-3)] text-section font-display font-semibold leading-tight text-[var(--color-primary)]"
          >
            Tu práctica,{" "}
            <span className="italic text-[var(--color-secondary)]">
              cuando tu cuerpo lo pide
            </span>
          </h2>
          <p className="mt-[var(--space-5)] max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
            Clases grabadas, pensadas para acompañarte en los días en que no puedes ir al centro. Prácticas de 15 a 60 minutos, para cualquier momento del día.
          </p>

          <ul className="mt-[var(--space-8)] space-y-[var(--space-3)]">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-[var(--space-3)]">
                <span
                  className="mt-[8px] h-[6px] w-[6px] flex-shrink-0 rounded-full bg-[var(--color-secondary)]"
                  aria-hidden
                />
                <span className="text-sm leading-relaxed text-[var(--color-text)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-[var(--space-8)] flex flex-wrap items-center gap-[var(--space-4)]">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium text-white transition-colors duration-[var(--duration-base)] hover:bg-[var(--color-primary-hover)]"
            >
              Ver biblioteca
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/panel/tienda"
              className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-[var(--duration-base)] hover:text-[var(--color-secondary)]"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
