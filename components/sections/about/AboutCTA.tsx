import { AnimateIn } from "@/components/ui/AnimateIn";
import { Button } from "@/components/ui/Button";

type Props = {
  eyebrow?: string;
  heading: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function AboutCTA({
  eyebrow = "Da el primer paso",
  heading,
  description,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  return (
    <section
      className="px-[var(--space-4)] py-[var(--space-24)] text-center text-[var(--color-text-inverse)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      style={{ background: "var(--color-primary)" }}
      aria-labelledby="sobre-cta-heading"
    >
      <div className="mx-auto max-w-3xl">
        <AnimateIn>
          <p className="mb-[var(--space-4)] text-xs font-medium uppercase tracking-[0.25em] opacity-60">
            {eyebrow}
          </p>
          <h2
            id="sobre-cta-heading"
            className="text-section font-display font-semibold"
          >
            {heading}
          </h2>
          {description && (
            <p className="mt-[var(--space-5)] text-base leading-relaxed opacity-80">
              {description}
            </p>
          )}
          <div className="mt-[var(--space-10)] flex flex-wrap justify-center gap-[var(--space-4)]">
            <Button href={ctaHref} variant="light">
              {ctaLabel}
            </Button>
            {secondaryLabel && secondaryHref && (
              <Button href={secondaryHref} variant="light">
                {secondaryLabel}
              </Button>
            )}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
