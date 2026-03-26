import type { CategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";

interface QuotaChipsProps {
  quotaUsage: CategoryQuotaUsage[];
  categoryNames: Record<string, string>;
  /** true for MEMBERSHIP_ON_DEMAND plans */
  unlimited: boolean;
}

const CATEGORY_COLORS: Record<number, string> = {
  0: "#a8c0a0",
  1: "#b8b0d0",
  2: "#d4c0a8",
  3: "#c8b8a8",
};

export function QuotaChips({ quotaUsage, categoryNames, unlimited }: QuotaChipsProps) {
  if (unlimited) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex-shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Acceso ilimitado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {quotaUsage.map((q, i) => (
        <div
          key={q.categoryId}
          className="flex-shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 flex items-center gap-2"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: CATEGORY_COLORS[i % 4] }}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {categoryNames[q.categoryId] ?? "Categoría"}
          </span>
          <span className="text-xs font-bold text-[var(--color-text)]">
            {q.remaining}/{q.maxLessons}
          </span>
        </div>
      ))}
    </div>
  );
}
