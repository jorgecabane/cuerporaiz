import Link from "next/link";
import Image from "next/image";
import { urlForImage } from "@/lib/sanity/image";
import type { PostSummary } from "@/lib/sanity/types";
import { formatPostDate } from "./utils";

type BlogHeroProps = {
  featured: PostSummary;
};

export function BlogHero({ featured }: BlogHeroProps) {
  const coverUrl = urlForImage(featured.coverImage) ?? "";
  const coverAlt = featured.coverImage.alt ?? featured.title;

  return (
    <section className="mb-[var(--space-12)]">
      <p className="mb-[var(--space-5)] text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
        Destacado
      </p>

      <article className="grid grid-cols-1 overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-[var(--shadow-sm)] md:grid-cols-2">
        <Link href={`/blog/${featured.slug}`} className="relative block aspect-[5/4] md:aspect-auto">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={coverAlt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="flex flex-col justify-center p-[var(--space-8)] md:p-[var(--space-12)]">
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            {featured.category ? (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
                {featured.category.name}
              </span>
            ) : null}
            {featured.readingMinutes ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{featured.readingMinutes} min de lectura</span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{formatPostDate(featured.publishedAt)}</span>
          </div>

          <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-[var(--color-primary)] md:text-4xl lg:text-5xl">
            {featured.title}
          </h2>

          <p className="mt-4 font-display text-lg text-[var(--color-text-muted)] md:text-xl">
            {featured.excerpt}
          </p>

          <Link
            href={`/blog/${featured.slug}`}
            className="mt-[var(--space-8)] inline-flex items-center gap-2 self-start rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium text-white transition-colors duration-[var(--duration-normal)] hover:bg-[var(--color-primary-hover)]"
          >
            Leer artículo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    </section>
  );
}
