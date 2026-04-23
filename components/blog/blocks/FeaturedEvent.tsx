import Image from "next/image";
import Link from "next/link";
import { urlForImage } from "@/lib/sanity/image";

type FeaturedEventValue = {
  eyebrow?: string;
  title: string;
  dateLabel: string;
  location?: string;
  description?: string;
  image?: unknown;
  ctaLabel?: string;
  ctaHref: string;
};

export function FeaturedEvent({ value }: { value: FeaturedEventValue }) {
  const url = urlForImage(value.image as Parameters<typeof urlForImage>[0]);
  const isExternal = /^https?:\/\//.test(value.ctaHref);

  const button = (
    <span className="inline-flex items-center gap-2 self-start rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]">
      {value.ctaLabel ?? "Ver detalles"} <span aria-hidden="true">→</span>
    </span>
  );

  return (
    <article className="not-prose mx-auto my-[var(--space-10)] grid max-w-[80ch] grid-cols-1 overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:grid-cols-2">
      <div className="relative aspect-[4/3] sm:aspect-auto">
        {url ? (
          <Image
            src={url}
            alt={value.title}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-col justify-center gap-2 p-7 md:p-8">
        {value.eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-secondary)]">
            {value.eyebrow}
          </p>
        ) : null}
        <h3 className="font-display text-2xl leading-tight text-[var(--color-primary)]">
          {value.title}
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {value.dateLabel}
          {value.location ? ` · ${value.location}` : ""}
        </p>
        {value.description ? (
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]">
            {value.description}
          </p>
        ) : null}
        <div className="mt-3">
          {isExternal ? (
            <a href={value.ctaHref} target="_blank" rel="noopener noreferrer">
              {button}
            </a>
          ) : (
            <Link href={value.ctaHref}>{button}</Link>
          )}
        </div>
      </div>
    </article>
  );
}
