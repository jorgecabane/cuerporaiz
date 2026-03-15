interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-md)] bg-[var(--color-border)]/40 ${className}`}
    />
  );
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

export function CalendarSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] p-4 space-y-3">
      <div className="grid grid-cols-8 gap-2">
        <Skeleton className="h-10" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-8 gap-2">
          <Skeleton className="h-8" />
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] p-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
