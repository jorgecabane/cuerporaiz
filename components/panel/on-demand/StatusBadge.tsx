import type { OnDemandContentStatus } from "@/lib/domain/on-demand";
import { CONTENT_STATUS_LABELS } from "@/lib/domain/on-demand";

export function StatusBadge({ status }: { status: OnDemandContentStatus }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        status === "PUBLISHED"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}
