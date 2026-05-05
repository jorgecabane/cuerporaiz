import type { OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";

const STATUS_CLASS: Record<OnDemandContentStatus, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status }: { status: OnDemandContentStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[status]}`}>
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}
