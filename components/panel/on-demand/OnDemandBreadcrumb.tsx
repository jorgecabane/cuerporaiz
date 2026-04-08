import Link from "next/link";

type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export function OnDemandBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <nav aria-label="Navegación" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {segments.map((segment, i) => {
          const isLast = i === segments.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--color-border)]">/</span>}
              {segment.href && !isLast ? (
                <Link
                  href={segment.href}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className="text-[var(--color-text)]">{segment.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
