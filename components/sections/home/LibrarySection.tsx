import Image from "next/image";
import Link from "next/link";
import { AnimateIn, StaggerList, StaggerItem } from "@/components/ui/AnimateIn";

type LibraryCategory = {
  name: string;
  description?: string;
  image?: string;
  count?: number;
};

type LibrarySectionProps = {
  title?: string;
  subtitle?: string;
  heroTag?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroImage?: string;
  categories?: LibraryCategory[];
  /** Precio "desde" del plan más barato de biblioteca virtual. Opcional. */
  ctaPriceLabel?: string;
  /** Link al catálogo público. */
  href?: string;
};

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=80";

const DEFAULT_CATEGORIES: LibraryCategory[] = [
  {
    name: "Hatha",
    description: "Prácticas lentas para habitar el cuerpo.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
  },
  {
    name: "Meditación",
    description: "Silencios guiados de 10 a 40 minutos.",
    image: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=600&q=80",
  },
  {
    name: "Somática",
    description: "Escucha del cuerpo y sus pausas.",
    image: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=600&q=80",
  },
];

export function LibrarySection({
  title,
  subtitle,
  heroTag,
  heroTitle,
  heroDescription,
  heroImage,
  categories,
  ctaPriceLabel,
  href = "/catalogo",
}: LibrarySectionProps) {
  const displayCategories = (categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES).slice(0, 3);

  return (
    <section
      id="biblioteca-virtual"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="library-heading"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            {subtitle ?? "Biblioteca virtual"}
          </p>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <h2
            id="library-heading"
            className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
          >
            {title ?? "Practica a tu ritmo, donde quieras"}
          </h2>
        </AnimateIn>

        {/* Bento grid */}
        <StaggerList
          stagger={0.1}
          delayChildren={0.15}
          className="mt-[var(--space-12)] grid gap-[var(--space-6)] md:grid-cols-3 md:grid-rows-2"
        >
          {/* Hero tile (2x2) */}
          <StaggerItem className="md:col-span-2 md:row-span-2">
            <Link
              href={href}
              className="group relative block h-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-primary)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-lg)]"
            >
              <div className="relative aspect-[4/3] md:aspect-auto md:h-full">
                <Image
                  src={heroImage ?? DEFAULT_HERO_IMAGE}
                  alt={heroTitle ?? "Biblioteca virtual de clases grabadas"}
                  fill
                  className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary)]/90 via-[var(--color-primary)]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-[var(--space-6)] md:p-[var(--space-8)]">
                  <span className="inline-block rounded-full bg-white/20 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white backdrop-blur-sm">
                    {heroTag ?? "Acceso ilimitado"}
                  </span>
                  <h3 className="mt-[var(--space-4)] font-display text-3xl font-semibold text-white md:text-4xl">
                    {heroTitle ?? "Una biblioteca que crece contigo"}
                  </h3>
                  <p className="mt-[var(--space-3)] max-w-md text-sm leading-relaxed text-white/85 md:text-base">
                    {heroDescription ?? "Más de 50 clases grabadas. Nuevo contenido cada mes."}
                  </p>
                  <div className="mt-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-4)]">
                    <span className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-white">
                      Explorar biblioteca
                      <span aria-hidden>→</span>
                    </span>
                    {ctaPriceLabel && (
                      <span className="text-xs text-white/75">{ctaPriceLabel}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </StaggerItem>

          {/* Category tiles */}
          {displayCategories.map((cat) => (
            <StaggerItem key={cat.name}>
              <Link
                href={href}
                className="group relative block h-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-tertiary)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-lg)]"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={cat.image ?? DEFAULT_HERO_IMAGE}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-[var(--space-5)]">
                    {typeof cat.count === "number" && (
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/70">
                        {cat.count} {cat.count === 1 ? "clase" : "clases"}
                      </p>
                    )}
                    <h3 className="mt-[var(--space-1)] font-display text-xl font-semibold text-white">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-[var(--space-1)] line-clamp-2 text-xs leading-relaxed text-white/85">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
