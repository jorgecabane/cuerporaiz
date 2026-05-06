import Link from "next/link";
import { Hourglass, ArrowRight } from "lucide-react";

interface Props {
  count: number;
  oldestClaimedAt: Date | null;
  /**
   * "student" → pasivo (sólo informa).
   * "admin"   → accionable (lleva al panel de pagos a aprobar/rechazar).
   */
  variant: "student" | "admin";
}

function relativeAge(from: Date): string {
  const ms = Date.now() - from.getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

export function PendingTransferBanner({ count, oldestClaimedAt, variant }: Props) {
  if (count <= 0) return null;

  const isAdmin = variant === "admin";
  const title = isAdmin
    ? `${count} ${count === 1 ? "transferencia" : "transferencias"} por revisar`
    : count === 1
      ? "Tu transferencia está en revisión"
      : `Tienes ${count} transferencias en revisión`;

  const meta = oldestClaimedAt
    ? isAdmin
      ? `La más antigua ${relativeAge(oldestClaimedAt)}`
      : `Enviada ${relativeAge(oldestClaimedAt)}`
    : null;

  const linkHref = isAdmin
    ? "/panel/pagos?type=transfers"
    : "/panel/mis-pagos";
  const linkLabel = isAdmin ? "Revisar ahora" : "Ver detalle";

  return (
    <Link
      href={linkHref}
      className={`group mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition-colors ${
        isAdmin
          ? "border-[#F59E0B] bg-[#FEF3C7] hover:bg-[#FDE68A]"
          : "border-[#FCD34D] bg-[#FFFBEB] hover:bg-[#FEF3C7]"
      }`}
      aria-label={title}
    >
      <Hourglass className="mt-0.5 size-5 shrink-0 text-[#92400E]" aria-hidden />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-[#78350F]">{title}</div>
        {meta && <div className="mt-0.5 text-xs text-[#92400E]">{meta}</div>}
      </div>
      <span className="flex items-center gap-1 self-center text-xs font-medium text-[#78350F] group-hover:underline">
        {linkLabel}
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}
