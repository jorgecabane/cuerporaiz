import Link from "next/link";
import type { PostCategoryRef } from "@/lib/sanity/types";

type CategoryFilterProps = {
  categories: Pick<PostCategoryRef, "_id" | "name" | "slug">[];
  activeSlug?: string;
};

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <nav
      aria-label="Filtro de categorías"
      className="flex items-center gap-2 overflow-x-auto pb-2"
      style={{ scrollSnapType: "x mandatory" }}
    >
      <CategoryChip href="/blog" active={!activeSlug}>
        Todo
      </CategoryChip>
      {categories.map((c) => (
        <CategoryChip
          key={c._id}
          href={`/blog/categoria/${c.slug}`}
          active={activeSlug === c.slug}
        >
          {c.name}
        </CategoryChip>
      ))}
    </nav>
  );
}

function CategoryChip({
  children,
  href,
  active,
}: {
  children: React.ReactNode;
  href: string;
  active: boolean;
}) {
  const base =
    "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-[background-color,color,border-color] duration-[var(--duration-normal)] ease-out";
  const style = active
    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]";

  return (
    <Link href={href} className={`${base} ${style}`} style={{ scrollSnapAlign: "start" }}>
      {children}
    </Link>
  );
}
