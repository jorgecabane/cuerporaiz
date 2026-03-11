import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { orderRepository } from "@/lib/adapters/db";
import { userRepository } from "@/lib/adapters/db";
import { planRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { ApproveOrderForm } from "./ApproveOrderForm";
import type { OrderStatus } from "@/lib/ports";
import { ORDER_STATUS_LABELS } from "@/lib/ports";
import { isAdminRole } from "@/lib/domain";

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

export default async function PanelPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/pagos");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const { status } = await searchParams;
  const statusFilter = status as OrderStatus | undefined;
  const orders = await orderRepository.findManyByCenterId(centerId, {
    ...(statusFilter && { status: statusFilter }),
  });

  const userIds = [...new Set(orders.map((o) => o.userId))];
  const planIds = [...new Set(orders.map((o) => o.planId))];
  const users = await Promise.all(userIds.map((id) => userRepository.findById(id)));
  const plans = await Promise.all(planIds.map((id) => planRepository.findById(id)));
  const userMap = Object.fromEntries(
    users.filter(Boolean).map((u) => [u!.id, u!])
  );
  const planMap = Object.fromEntries(
    plans.filter(Boolean).map((p) => [p!.id, p!])
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Pagos y conciliación
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Órdenes de este centro. Conciliación manual: marcar como aprobado órdenes pendientes (ej. transferencia).
      </p>

      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          href="/panel/pagos"
          variant={statusFilter == null ? "primary" : "secondary"}
        >
          Todos
        </Button>
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
          <Button
            key={s}
            href={`/panel/pagos?status=${s}`}
            variant={statusFilter === s ? "primary" : "secondary"}
          >
            {ORDER_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay órdenes con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="p-3">Fecha</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Ref.</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-3 text-[var(--color-text-muted)]">
                    {order.createdAt.toLocaleString("es-CL")}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/panel/clientes/${order.userId}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {userMap[order.userId]?.email ?? order.userId}
                    </Link>
                  </td>
                  <td className="p-3">
                    {planMap[order.planId]?.name ?? order.planId}
                  </td>
                  <td className="p-3">
                    {formatPrice(order.amountCents, order.currency)}
                  </td>
                  <td className="p-3">
                    {ORDER_STATUS_LABELS[order.status]}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {order.externalReference}
                  </td>
                  <td className="p-3">
                    {order.status === "PENDING" && (
                      <ApproveOrderForm orderId={order.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
