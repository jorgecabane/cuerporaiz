import { AnimateIn } from "@/components/ui/AnimateIn";
import { Button } from "@/components/ui/Button";

type Props = {
  eyebrow?: string;
  name: string;
  tagline?: string;
  heroImageUrl?: string;
  ctaLabel: string;
  ctaHref: string;
};

export function AboutHero({ eyebrow, name, tagline, heroImageUrl, ctaLabel, ctaHref }: Props) {
  return (
    <section
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] pb-[var(--space-20)] pt-[var(--space-20)] md:px-[var(--space-8)] md:pb-[var(--space-24)] md:pt-[var(--space-32)]"
      aria-labelledby="sobre-hero-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-[var(--space-12)] lg:grid-cols-[1.1fr_1fr] lg:gap-[var(--space-20)]">
          {/* Texto */}
          <div>
            <AnimateIn>
              {eyebrow && (
                <p className="mb-[var(--space-5)] text-xs font-medium uppercase tracking-[0.25em] text-[var(--color-secondary)]">
                  {eyebrow}
                </p>
              )}
              <h1
                id="sobre-hero-heading"
                className="text-hero font-display font-semibold text-[var(--color-primary)]"
              >
                {name}
              </h1>
            </AnimateIn>

            {tagline && (
              <AnimateIn delay={0.1}>
                <p className="mt-[var(--space-5)] max-w-lg font-display text-xl italic leading-relaxed text-[var(--color-text-muted)] md:text-2xl">
                  &ldquo;{tagline}&rdquo;
                </p>
              </AnimateIn>
            )}

            <AnimateIn delay={0.15}>
              <div className="mt-[var(--space-10)]">
                <Button href={ctaHref}>{ctaLabel}</Button>
              </div>
            </AnimateIn>
          </div>

          {/* Imagen */}
          {heroImageUrl && (
            <AnimateIn delay={0.12} className="order-first lg:order-last">
              <div className="relative mx-auto w-full max-w-md">
                <div
                  className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)]"
                  style={{ boxShadow: "var(--shadow-lg)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* acento decorativo */}
                <div
                  aria-hidden="true"
                  className="absolute -bottom-5 -left-5 hidden h-24 w-24 rounded-[var(--radius-md)] md:block"
                  style={{ background: "var(--color-secondary)", opacity: 0.9 }}
                />
              </div>
            </AnimateIn>
          )}
        </div>
      </div>
    </section>
  );
}
