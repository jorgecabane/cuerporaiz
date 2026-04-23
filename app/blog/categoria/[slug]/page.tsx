import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isSanityConfigured, sanityFetch } from "@/lib/sanity/client";
import {
  QUERY_ALL_CATEGORIES,
  QUERY_CATEGORY_BY_SLUG,
  QUERY_POSTS_BY_CATEGORY,
} from "@/lib/sanity/queries";
import type { PostCategoryRef, PostSummary } from "@/lib/sanity/types";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { PostGrid } from "@/components/blog/PostGrid";

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  if (!isSanityConfigured()) return {};
  const { slug } = await params;
  const category = await sanityFetch<PostCategoryRef | null>(
    QUERY_CATEGORY_BY_SLUG,
    { slug },
  );
  if (!category) return {};

  return {
    title: `${category.name} — Blog Cuerpo Raíz`,
    description: category.description ?? `Artículos sobre ${category.name.toLowerCase()}.`,
    alternates: { canonical: `/blog/categoria/${slug}` },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  if (!isSanityConfigured()) notFound();
  const { slug } = await params;

  const [category, posts, categories] = await Promise.all([
    sanityFetch<PostCategoryRef | null>(QUERY_CATEGORY_BY_SLUG, { slug }),
    sanityFetch<PostSummary[]>(QUERY_POSTS_BY_CATEGORY, { slug }, { tags: ["posts"] }),
    sanityFetch<PostCategoryRef[]>(QUERY_ALL_CATEGORIES, {}, { tags: ["categories"] }),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-[var(--space-6)] py-[var(--space-16)] md:px-[var(--space-10)]">
      <header className="mb-[var(--space-10)]">
        <p className="mb-[var(--space-4)] text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
          Categoría
        </p>
        <h1 className="font-display text-4xl italic leading-[1.04] tracking-tight text-[var(--color-primary)] md:text-5xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-[var(--space-4)] max-w-xl font-display text-lg text-[var(--color-text-muted)] md:text-xl">
            {category.description}
          </p>
        ) : null}
      </header>

      {categories && categories.length > 0 ? (
        <div className="mb-[var(--space-10)]">
          <CategoryFilter categories={categories} activeSlug={slug} />
        </div>
      ) : null}

      <PostGrid posts={posts ?? []} />
    </div>
  );
}
