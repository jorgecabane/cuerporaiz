import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isSanityConfigured, sanityFetch } from "@/lib/sanity/client";
import {
  QUERY_ALL_CATEGORIES,
  QUERY_ALL_POSTS,
  QUERY_FEATURED_POST,
} from "@/lib/sanity/queries";
import type { PostCategoryRef, PostSummary } from "@/lib/sanity/types";
import { BlogHero } from "@/components/blog/BlogHero";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { PostGrid } from "@/components/blog/PostGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Cuerpo Raíz",
  description:
    "Ensayos, prácticas guiadas y crónicas sobre cuerpo, respiración y el camino de regreso a ti.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  if (!isSanityConfigured()) notFound();

  const [featured, posts, categories] = await Promise.all([
    sanityFetch<PostSummary | null>(QUERY_FEATURED_POST, {}, { tags: ["posts"] }),
    sanityFetch<PostSummary[]>(QUERY_ALL_POSTS, {}, { tags: ["posts"] }),
    sanityFetch<PostCategoryRef[]>(QUERY_ALL_CATEGORIES, {}, { tags: ["categories"] }),
  ]);

  const restPosts = featured
    ? (posts ?? []).filter((p) => p._id !== featured._id)
    : posts ?? [];

  return (
    <div className="mx-auto max-w-6xl px-[var(--space-6)] py-[var(--space-16)] md:px-[var(--space-10)]">
      <header className="mb-[var(--space-12)] md:mb-[var(--space-16)]">
        <p className="mb-[var(--space-4)] text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
          Blog
        </p>
        <h1 className="max-w-3xl font-display text-4xl italic leading-[1.04] tracking-tight text-[var(--color-primary)] md:text-6xl lg:text-7xl">
          Ideas sobre cuerpo, respiración y el camino de regreso a ti.
        </h1>
        <p className="mt-[var(--space-5)] max-w-xl font-display text-lg text-[var(--color-text-muted)] md:text-xl">
          Ensayos, prácticas guiadas y crónicas desde la sala de Vitacura y los retiros.
        </p>
      </header>

      {featured ? <BlogHero featured={featured} /> : null}

      <section className="mt-[var(--space-8)]">
        <div className="mb-[var(--space-5)] flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
            Últimos artículos
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {posts?.length ?? 0} publicaciones
          </p>
        </div>

        {categories && categories.length > 0 ? (
          <div className="mb-[var(--space-8)]">
            <CategoryFilter categories={categories} />
          </div>
        ) : null}

        <PostGrid posts={restPosts} />
      </section>
    </div>
  );
}
