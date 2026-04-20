import Image from "next/image";
import Link from "next/link";

const HERO_IMG = "https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=80";
const CATEGORIES = [
  {
    title: "Hatha",
    description: "Prácticas lentas para habitar el cuerpo.",
    count: 24,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
  },
  {
    title: "Meditación",
    description: "Silencios guiados de 10 a 40 minutos.",
    count: 18,
    image: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=600&q=80",
  },
  {
    title: "Somática",
    description: "Escucha del cuerpo y sus pausas.",
    count: 12,
    image: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=600&q=80",
  },
];

export function VariantABento() {
  return (
    <section
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="mock-lib-bento-heading"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
          Biblioteca virtual
        </p>
        <h2
          id="mock-lib-bento-heading"
          className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
        >
          Practica a tu ritmo, donde quieras
        </h2>
        <p className="mt-[var(--space-4)] max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
          Más de 50 clases grabadas en HD. Hatha, meditación, prácticas somáticas y charlas de bienestar. Nuevo contenido cada mes.
        </p>

        <div className="mt-[var(--space-12)] grid gap-[var(--space-6)] md:grid-cols-3 md:grid-rows-2">
          {/* Hero tile (2x2) */}
          <article className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-primary)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-lg)] md:col-span-2 md:row-span-2">
            <div className="relative aspect-[4/3] md:aspect-auto md:h-full">
              <Image
                src={HERO_IMG}
                alt="Práctica de yoga en casa"
                fill
                className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
                sizes="(max-width: 768px) 100vw, 66vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary)]/90 via-[var(--color-primary)]/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-[var(--space-8)]">
                <span className="inline-block rounded-full bg-white/20 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white backdrop-blur-sm">
                  Acceso ilimitado
                </span>
                <h3 className="mt-[var(--space-4)] font-display text-3xl font-semibold text-white md:text-4xl">
                  Una biblioteca que crece contigo
                </h3>
                <p className="mt-[var(--space-3)] max-w-md text-sm leading-relaxed text-white/85 md:text-base">
                  Desbloquea el catálogo completo. Nuevos videos cada mes.
                </p>
                <Link
                  href="/catalogo"
                  className="mt-[var(--space-6)] inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-white transition-colors duration-[var(--duration-base)] hover:bg-[var(--color-secondary-hover,_var(--color-secondary))]"
                >
                  Explorar biblioteca
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </article>

          {/* Category tiles (1x1 each) */}
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              href="/catalogo"
              className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-tertiary)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-lg)]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-[var(--space-5)]">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/70">
                    {cat.count} clases
                  </p>
                  <h3 className="mt-[var(--space-1)] font-display text-xl font-semibold text-white">
                    {cat.title}
                  </h3>
                  <p className="mt-[var(--space-1)] text-xs leading-relaxed text-white/85">
                    {cat.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
