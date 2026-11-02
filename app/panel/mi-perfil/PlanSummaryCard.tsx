import Link from "next/link";
import { prisma } from "@/lib/adapters/db/prisma";
import { centerRepository } from "@/lib/adapters/db";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import {
  DEFAULT_PLAN_EXPIRING_NOTICE_DAYS,
  getPlanDisplayStatus,
  isPlanCurrent,
  pickLapsedPlan,
} from "@/lib/domain/user-plan";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";

interface PlanSummaryCardProps {
  userId: string;
  centerId: string;
}

export default async function PlanSummaryCard({ userId, centerId }: PlanSummaryCardProps) {
  const [tz, center, plans] = await Promise.all([
    getCenterTimezone(centerId),
    centerRepository.findById(centerId),
    prisma.userPlan.findMany({
      where: { userId, centerId, status: "ACTIVE" },
      include: { plan: true, subscription: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const now = new Date();
  const noticeDays = center?.planExpiringNoticeDays ?? DEFAULT_PLAN_EXPIRING_NOTICE_DAYS;
  // Estado real: un plan guardado como ACTIVE puede estar vencido o sin clases.
  const userPlan =
    plans.find((p) => isPlanCurrent(getPlanDisplayStatus(p, now, noticeDays))) ?? pickLapsedPlan(plans, now);

  if (!userPlan) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No tienes un plan activo</p>
        <Link
          href="/panel/tienda"
          className="mt-3 inline-block text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  const status = getPlanDisplayStatus(userPlan, now, noticeDays);
  const lapsed = !isPlanCurrent(status);
  const classesLabel = userPlan.classesTotal
    ? `${userPlan.classesUsed} / ${userPlan.classesTotal} clases usadas`
    : "Clases ilimitadas";

  const validUntilLabel = userPlan.validUntil
    ? userPlan.validUntil.toLocaleDateString("es-CL", { timeZone: tz })
    : "Sin vencimiento";

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{userPlan.plan.name}</h3>
        <PlanStatusBadge status={status} />
      </div>

      <div className="space-y-1 text-sm text-[var(--color-text-muted)]">
        <p>{classesLabel}</p>
        <p>
          {status === "EXPIRED" ? "Venció el" : "Vigencia hasta:"} {validUntilLabel}
        </p>
        {userPlan.subscription && !lapsed && (
          <p className="text-xs">Suscripción activa</p>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/panel/tienda"
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90"
        >
          {lapsed ? "Comprar otro plan" : "Renovar plan"}
        </Link>
        <Link
          href="/panel/reservas"
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
        >
          Mis reservas
        </Link>
      </div>
    </div>
  );
}
