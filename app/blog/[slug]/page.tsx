import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { draftMode } from "next/headers";

import { isSanityConfigured, sanityFetch } from "@/lib/sanity/client";
import { urlForImage } from "@/lib/sanity/image";
import {
  QUERY_POST_BY_SLUG,
  QUERY_POST_SLUGS,
  QUERY_RELATED_POSTS,
} from "@/lib/sanity/queries";
import type { PostDetail, PostSummary } from "@/lib/sanity/types";

import { PostBody } from "@/components/blog/PostBody";
import { AuthorCard } from "@/components/blog/AuthorCard";
import { PostCard } from "@/components/blog/PostCard";
import { DraftModeBanner } from "@/components/blog/DraftModeBanner";
import { formatPostDate, estimateReadingMinutes } from "@/components/blog/utils";

export const revalidate = 60;

export async function generateStaticParams() {
  if (!isSanityConfigured()) return [];
  const slugs = (await sanityFetch<string[]>(QUERY_POST_SLUGS, {}, { revalidate: 300 })) ?? [];
  return slugs.map((slug) => ({ slug }));
}

type Params = { slug: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  if (!isSanityConfigured()) return {};
  const { slug } = await params;
  const post = await sanityFetch<PostDetail | null>(
    QUERY_POST_BY_SLUG,
    { slug },
    { tags: [`post:${slug}`] },
  );
  if (!post) return {};

  const title = post.seo?.metaTitle ?? post.title;
  const description = post.seo?.metaDescription ?? post.excerpt;
  const ogImage = urlForImage(post.seo?.ogImage ?? post.coverImage) ?? undefined;

  return {
    title: `${title} — Cuerpo Raíz`,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${slug}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  if (!isSanityConfigured()) notFound();
  const { slug } = await params;
  const { isEnabled: isDraft } = await draftMode();

  const post = await sanityFetch<PostDetail | null>(
    QUERY_POST_BY_SLUG,
    { slug },
    { tags: [`post:${slug}`], draft: isDraft },
  );
  if (!post) notFound();

  const primaryCategory = post.categories?.[0];
  const categoryIds = (post.categories ?? []).map((c) => c._id).filter(Boolean);

  const relatedPosts = categoryIds.length
    ? (await sanityFetch<PostSummary[]>(
        QUERY_RELATED_POSTS,
        { slug, categoryIds },
        { tags: ["posts"] },
      )) ?? []
    : [];

  const coverUrl = urlForImage(post.coverImage) ?? "";
  const minutes = estimateReadingMinutes(post.body, post.readingMinutes);

  return (
    <article className="pb-[var(--space-20)]">
      {isDraft ? <DraftModeBanner /> : null}

      <header className="mx-auto max-w-3xl px-[var(--space-6)] pb-[var(--space-10)] pt-[var(--space-12)] text-center md:px-[var(--space-10)] md:pt-[var(--space-16)]">
        <Link
          href="/blog"
          className="mb-[var(--space-8)] inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <span aria-hidden="true">←</span> Volver al blog
        </Link>

        <div className="mb-[var(--space-6)] flex items-center justify-center gap-3 text-xs text-[var(--color-text-muted)]">
          {primaryCategory ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
              {primaryCategory.name}
            </span>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{minutes} min de lectura</span>
          <span aria-hidden="true">·</span>
          <span>{formatPostDate(post.publishedAt)}</span>
        </div>

        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-[var(--color-primary)] md:text-5xl lg:text-6xl">
          {post.title}
        </h1>
        <p className="mx-auto mt-[var(--space-6)] max-w-2xl font-display text-xl italic leading-snug text-[var(--color-text-muted)] md:text-2xl">
          {post.excerpt}
        </p>
      </header>

      {coverUrl ? (
        <div className="mx-auto mb-[var(--space-12)] max-w-5xl px-[var(--space-6)] md:px-[var(--space-10)]">
          <figure>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={coverUrl}
                alt={post.coverImage.alt ?? post.title}
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
                className="object-cover"
              />
            </div>
            {post.coverImage.caption ? (
              <figcaption className="mt-3 text-center text-sm italic text-[var(--color-text-muted)]">
                {post.coverImage.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}

      <div className="px-[var(--space-6)] md:px-[var(--space-10)]">
        <PostBody value={post.body} />
      </div>

      <div className="px-[var(--space-6)] md:px-[var(--space-10)]">
        <AuthorCard author={post.author} />
      </div>

      {relatedPosts.length > 0 && primaryCategory ? (
        <section className="mx-auto mt-[var(--space-16)] max-w-[52rem] px-[var(--space-6)] md:px-[var(--space-10)]">
          <h3 className="mb-[var(--space-6)] font-display text-2xl text-[var(--color-primary)]">
            Sigue leyendo en {primaryCategory.name}
          </h3>
          <div className="grid grid-cols-1 gap-[var(--space-6)] md:grid-cols-3">
            {relatedPosts.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
