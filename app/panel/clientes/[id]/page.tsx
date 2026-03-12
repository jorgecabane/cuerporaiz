import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { userRepository } from "@/lib/adapters/db";
import { orderRepository } from "@/lib/adapters/db";
import { planRepository } from "@/lib/adapters/db";
import { ROLE_LABELS, isAdminRole } from "@/lib/domain";
import { Button } from "@/components/ui/Button";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

export default async function PanelClientesDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/clientes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const { id: userId } = await params;

  const clients = await userRepository.findManyByCenterId(centerId);
  const client = clients.find((u) => u.id === userId);
  if (!client) notFound();

  const orders = await orderRepository.findManyByUserIdAndCenterId(userId, centerId);
  const planIds = [...new Set(orders.map((o) => o.planId))];
  const plans = await Promise.all(
    planIds.map((pid) => planRepository.findById(pid))
  );
  const planMap = Object.fromEntries(
    plans.filter(Boolean).map((p) => [p!.id, p!])
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Cliente
      </h1>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] mb-6">
        <dl className="grid gap-2">
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Email</dt>
            <dd className="font-medium">{client.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Nombre</dt>
            <dd className="font-medium">{client.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Rol en este centro</dt>
            <dd className="font-medium">{ROLE_LABELS[client.role] ?? client.role}</dd>
          </div>
        </dl>
      </div>

      <h2 className="font-semibold text-[var(--color-text)] mb-3">Órdenes en este centro</h2>
      {orders.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4">
          <p className="text-[var(--color-text-muted)] text-sm">Sin órdenes.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-sm"
            >
              <span className="font-medium">
                {planMap[order.planId]?.name ?? order.planId}
              </span>
              {" · "}
              {formatPrice(order.amountCents, order.currency)}
              {" · "}
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
              {" · "}
              <span className="text-[var(--color-text-muted)]">
                {order.createdAt.toLocaleDateString("es-CL")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Button href="/panel/clientes" variant="secondary">
          Volver a clientes
        </Button>
      </div>
    </div>
  );
}
