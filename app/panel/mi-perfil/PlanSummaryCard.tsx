import Link from "next/link";
import { prisma } from "@/lib/adapters/db/prisma";

interface PlanSummaryCardProps {
  userId: string;
  centerId: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  FROZEN: "Congelado",
  CANCELLED: "Cancelado",
};

export default async function PlanSummaryCard({ userId, centerId }: PlanSummaryCardProps) {
  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, centerId, status: "ACTIVE" },
    include: { plan: true, subscription: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

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

  const classesLabel = userPlan.classesTotal
    ? `${userPlan.classesUsed} / ${userPlan.classesTotal} clases usadas`
    : "Clases ilimitadas";

  const validUntilLabel = userPlan.validUntil
    ? userPlan.validUntil.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })
    : "Sin vencimiento";

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{userPlan.plan.name}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
          {STATUS_LABELS[userPlan.status] ?? userPlan.status}
        </span>
      </div>

      <div className="space-y-1 text-sm text-[var(--color-text-muted)]">
        <p>{classesLabel}</p>
        <p>Vigencia hasta: {validUntilLabel}</p>
        {userPlan.subscription && (
          <p className="text-xs">Suscripción activa</p>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/panel/tienda"
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90"
        >
          Renovar plan
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
