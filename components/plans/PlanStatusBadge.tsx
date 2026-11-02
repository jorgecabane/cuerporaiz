import { PLAN_DISPLAY_STATUS_LABELS, type PlanDisplayStatus } from "@/lib/domain/user-plan";

const STYLES: Record<PlanDisplayStatus, string> = {
  ACTIVE: "bg-[var(--color-success)]/10 text-[var(--color-success-hover)]",
  EXPIRING_SOON: "bg-[var(--color-secondary-light)] text-[var(--color-secondary-hover)]",
  UPCOMING: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  EXPIRED: "bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
  EXHAUSTED: "bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
  FROZEN: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  CANCELLED: "bg-[var(--color-tertiary)] text-[var(--color-text-muted)]",
};

/** Estado real del plan (vencido / sin clases / vence pronto…), con texto, no solo color. */
export function PlanStatusBadge({ status }: { status: PlanDisplayStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLES[status]}`}>
      {PLAN_DISPLAY_STATUS_LABELS[status]}
    </span>
  );
}
