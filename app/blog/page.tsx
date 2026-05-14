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
import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";
import { getPublicCenterTimezone } from "@/lib/datetime/center-timezone";

export const revalidate = 60;

const DEFAULT_HERO_TITLE = "Ideas sobre cuerpo, respiración y el camino de regreso a ti.";
const DEFAULT_HERO_SUBTITLE =
  "Ensayos, prácticas guiadas y crónicas desde la sala de Vitacura y los retiros.";

export const metadata: Metadata = {
  title: "Blog — Cuerpo Raíz",
  description:
    "Ensayos, prácticas guiadas y crónicas sobre cuerpo, respiración y el camino de regreso a ti.",
  alternates: { canonical: "/blog" },
};

async function loadHeroCopy() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return null;
  const center = await centerRepository.findBySlug(slug);
  if (!center) return null;
  return siteConfigRepository.findByCenterId(center.id);
}

export default async function BlogIndexPage() {
  if (!isSanityConfigured()) notFound();

  // Si Sanity está temporalmente inalcanzable en build/SSR, devolvemos página vacía
  // en lugar de romper el build entero. ISR (revalidate=60) lo recuperará al volver.
  const [featured, posts, categories, siteConfig, tz] = await Promise.all([
    sanityFetch<PostSummary | null>(QUERY_FEATURED_POST, {}, { tags: ["posts"] }).catch(() => null),
    sanityFetch<PostSummary[]>(QUERY_ALL_POSTS, {}, { tags: ["posts"] }).catch(() => [] as PostSummary[]),
    sanityFetch<PostCategoryRef[]>(QUERY_ALL_CATEGORIES, {}, { tags: ["categories"] }).catch(() => [] as PostCategoryRef[]),
    loadHeroCopy(),
    getPublicCenterTimezone(),
  ]);

  const heroTitle = siteConfig?.blogHeroTitle ?? DEFAULT_HERO_TITLE;
  const heroSubtitle = siteConfig?.blogHeroSubtitle ?? DEFAULT_HERO_SUBTITLE;

  const restPosts = featured
    ? (posts ?? []).filter((p) => p._id !== featured._id)
    : posts ?? [];

  return (
    <div className="mx-auto max-w-6xl px-[var(--space-4)] py-[var(--space-10)] sm:px-[var(--space-6)] sm:py-[var(--space-12)] md:px-[var(--space-10)] md:py-[var(--space-16)]">
      <header className="mb-[var(--space-10)] md:mb-[var(--space-16)]">
        <p className="mb-[var(--space-4)] text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
          Blog
        </p>
        <h1 className="max-w-3xl font-display text-3xl italic leading-[1.08] tracking-tight text-[var(--color-primary)] sm:text-4xl md:text-6xl lg:text-7xl">
          {heroTitle}
        </h1>
        <p className="mt-[var(--space-5)] max-w-xl font-display text-base text-[var(--color-text-muted)] sm:text-lg md:text-xl">
          {heroSubtitle}
        </p>
      </header>

      {featured ? <BlogHero featured={featured} tz={tz} /> : null}

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

        <PostGrid posts={restPosts} tz={tz} />
      </section>
    </div>
  );
}
