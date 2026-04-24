import Link from "next/link";
import Image from "next/image";
import { urlForImage } from "@/lib/sanity/image";
import type { PostSummary } from "@/lib/sanity/types";
import { formatPostDate } from "./utils";

type PostCardProps = {
  post: PostSummary;
};

export function PostCard({ post }: PostCardProps) {
  const coverUrl = urlForImage(post.coverImage) ?? "";
  const coverAlt = post.coverImage.alt ?? post.title;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.995]"
      aria-label={`Leer: ${post.title}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={coverAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[var(--duration-slow)] ease-out group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="p-[var(--space-6)]">
        <div className="mb-[var(--space-3)] flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {post.category ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-secondary)]">
              {post.category.name}
            </span>
          ) : null}
          {post.readingMinutes ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min</span>
            </>
          ) : null}
        </div>
        <h3 className="font-display text-xl leading-tight tracking-tight text-[var(--color-primary)]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-muted)]">{post.excerpt}</p>
        <p className="mt-[var(--space-4)] text-xs text-[var(--color-text-muted)]">
          {formatPostDate(post.publishedAt)}
        </p>
      </div>
    </Link>
  );
}
