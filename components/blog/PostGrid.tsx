import type { PostSummary } from "@/lib/sanity/types";
import { PostCard } from "./PostCard";

type PostGridProps = {
  posts: PostSummary[];
  emptyMessage?: string;
};

export function PostGrid({ posts, emptyMessage }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-[var(--space-6)] py-[var(--space-12)] text-center text-sm text-[var(--color-text-muted)]">
        {emptyMessage ?? "Todavía no hay artículos publicados en esta categoría."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[var(--space-8)] sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}
