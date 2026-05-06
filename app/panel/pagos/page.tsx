import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { manualPaymentRepository, orderRepository, planRepository, userRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { Button } from "@/components/ui/Button";
import { ApproveOrderForm } from "./ApproveOrderForm";
import { ApproveTransferButton, RejectTransferButton } from "./TransferActions";
import { TransferReceiptViewer } from "./TransferReceiptViewer";
import { getTransferReceiptInfo } from "@/lib/application/get-transfer-receipt-info";
import type { OrderStatus } from "@/lib/ports";
import { ORDER_STATUS_LABELS } from "@/lib/ports";
import { isAdminRole } from "@/lib/domain";
import { computeDateRangeUtc, parsePaymentsSearchParams } from "@/lib/panel/payments-query";

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

function buildQuery(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>
): string {
  const sp = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v == null || v === "") continue;
    sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

interface PendingTransferRow {
  id: string; // unique id (`order-<id>` or `ticket-<id>`)
  kind: "order" | "ticket";
  itemId: string; // raw orderId or ticketId
  userId: string;
  amountCents: number;
  currency: string;
  claimedAt: Date;
  receiptDocId: string | null;
  /** Para orders: planId → resolvemos el plan name desde planMap */
  planId?: string;
  /** Para tickets: title del evento */
  eventTitle?: string;
}

async function loadPendingTransfers(centerId: string): Promise<PendingTransferRow[]> {
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({
      where: {
        centerId,
        status: "PENDING",
        paymentMethod: "TRANSFER",
        transferClaimedAt: { not: null },
      },
      orderBy: { transferClaimedAt: "asc" },
      take: 100,
    }),
    prisma.eventTicket.findMany({
      where: {
        status: "PENDING",
        paymentMethod: "TRANSFER",
        transferClaimedAt: { not: null },
        event: { centerId },
      },
      include: { event: { select: { title: true } } },
      orderBy: { transferClaimedAt: "asc" },
      take: 100,
    }),
  ]);
  const orderRows: PendingTransferRow[] = orders.map((o) => ({
    id: `order-${o.id}`,
    kind: "order",
    itemId: o.id,
    userId: o.userId,
    amountCents: o.amountCents,
    currency: o.currency,
    claimedAt: o.transferClaimedAt!,
    receiptDocId: o.transferReceiptSanityId,
    planId: o.planId,
  }));
  const ticketRows: PendingTransferRow[] = tickets.map((t) => ({
    id: `ticket-${t.id}`,
    kind: "ticket",
    itemId: t.id,
    userId: t.userId,
    amountCents: t.amountCents,
    currency: t.currency,
    claimedAt: t.transferClaimedAt!,
    receiptDocId: t.transferReceiptSanityId,
    eventTitle: t.event?.title,
  }));
  return [...orderRows, ...ticketRows].sort(
    (a, b) => a.claimedAt.getTime() - b.claimedAt.getTime(),
  );
}

export default async function PanelPagosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/pagos");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const raw = await searchParams;
  const parsed = parsePaymentsSearchParams({
    type: raw.type,
    status: raw.status,
    email: raw.email,
    datePreset: raw.datePreset,
    from: raw.from,
    to: raw.to,
    page: raw.page,
  });
  const dateRange = computeDateRangeUtc({
    datePreset: parsed.datePreset,
    from: parsed.from,
    to: parsed.to,
  });
  const baseQuery: Record<string, string | undefined> = {
    type: parsed.type,
    status: parsed.type === "checkout" ? parsed.status : undefined,
    email: parsed.email,
    datePreset: parsed.datePreset,
    from: parsed.datePreset === "custom" ? parsed.from : undefined,
    to: parsed.datePreset === "custom" ? parsed.to : undefined,
    page: String(parsed.page),
  };

  const take = 20;
  const statusFilter =
    parsed.type === "checkout" && parsed.status
      ? (parsed.status as OrderStatus)
      : undefined;

  const checkoutPage =
    parsed.type === "checkout"
      ? await orderRepository.findPageByCenterId(centerId, {
          status: statusFilter,
          email: parsed.email,
          from: dateRange?.from,
          to: dateRange?.to,
          page: parsed.page,
          take,
        })
      : null;

  const manualPage =
    parsed.type === "manual"
      ? await manualPaymentRepository.findPageByCenterId(centerId, {
          email: parsed.email,
          from: dateRange?.from,
          to: dateRange?.to,
          page: parsed.page,
          take,
        })
      : null;

  const orders = checkoutPage?.items ?? [];
  const manualPayments = manualPage?.items ?? [];

  // Transferencias por revisar: orders + tickets pendientes con claim hecho.
  const transfersList =
    parsed.type === "transfers"
      ? await loadPendingTransfers(centerId)
      : [];

  const userIdsBase =
    parsed.type === "checkout"
      ? orders.map((x) => x.userId)
      : parsed.type === "manual"
        ? manualPayments.map((x) => x.userId)
        : transfersList.map((t) => t.userId);
  const userIds = [...new Set(userIdsBase)];
  const planIds =
    parsed.type === "checkout"
      ? [...new Set(orders.map((o) => o.planId))]
      : parsed.type === "transfers"
        ? [...new Set(transfersList.filter((t) => t.kind === "order").map((t) => t.itemId))]
        : [];
  const [users, plans] = await Promise.all([
    userRepository.findManyByIds(userIds),
    parsed.type === "checkout" || parsed.type === "transfers"
      ? planRepository.findManyByIds(planIds)
      : Promise.resolve([]),
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

  // Resolver URLs de comprobantes server-side (sin exponer al cliente público)
  const transferReceipts = await Promise.all(
    transfersList.map(async (t) =>
      t.receiptDocId
        ? { id: t.id, info: await getTransferReceiptInfo(t.receiptDocId) }
        : { id: t.id, info: null },
    ),
  );
  const receiptByTransferId = Object.fromEntries(
    transferReceipts.map(({ id, info }) => [id, info] as const),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Pagos
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Revisa pagos por checkout o registros manuales. Filtra por email y fecha, y navega en páginas de 20 resultados.
      </p>

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            href={`/panel/pagos${buildQuery(baseQuery, { type: "checkout", page: "1", status: parsed.status })}`}
            variant={parsed.type === "checkout" ? "primary" : "secondary"}
          >
            Checkout
          </Button>
          <Button
            href={`/panel/pagos${buildQuery(baseQuery, { type: "manual", page: "1", status: undefined })}`}
            variant={parsed.type === "manual" ? "primary" : "secondary"}
          >
            Manual
          </Button>
          <Button
            href={`/panel/pagos${buildQuery(baseQuery, { type: "transfers", page: "1", status: undefined })}`}
            variant={parsed.type === "transfers" ? "primary" : "secondary"}
          >
            Transferencias
            {parsed.type !== "transfers" && raw.txferCount && raw.txferCount !== "0" && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-[#FBBF24] px-1.5 py-0.5 text-[10px] font-bold text-[#78350F]">
                {raw.txferCount}
              </span>
            )}
          </Button>
        </div>

        <form method="get" className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]">
          <input type="hidden" name="type" value={parsed.type} />
          <input type="hidden" name="page" value="1" />

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Email cliente
              </label>
              <input
                id="email"
                name="email"
                type="text"
                defaultValue={parsed.email ?? ""}
                placeholder="cliente@correo.com"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="datePreset" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Fecha
              </label>
              <select
                id="datePreset"
                name="datePreset"
                defaultValue={parsed.datePreset ?? ""}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value="">Sin filtro</option>
                <option value="today">Hoy</option>
                <option value="last7">Últimos 7 días</option>
                <option value="thisMonth">Este mes</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label htmlFor="status" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Estado (solo checkout)
              </label>
              <select
                id="status"
                name="status"
                defaultValue={parsed.type === "checkout" ? (parsed.status ?? "") : ""}
                disabled={parsed.type !== "checkout"}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
              >
                <option value="">Todos</option>
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {parsed.datePreset === "custom" && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="from" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Desde
                </label>
                <input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={parsed.from ?? ""}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
              </div>
              <div>
                <label htmlFor="to" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Hasta
                </label>
                <input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={parsed.to ?? ""}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              Aplicar
            </button>
            <Button href={`/panel/pagos?type=${parsed.type}`} variant="secondary">
              Limpiar
            </Button>
            <span className="text-sm text-[var(--color-text-muted)] ml-auto">
              Página {parsed.page}
            </span>
          </div>
        </form>
      </div>

      {parsed.type === "transfers" ? (
        transfersList.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
            <p className="text-[var(--color-text-muted)]">
              No hay transferencias por revisar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transfersList.map((row) => {
              const buyer = userMap[row.userId];
              const itemName =
                row.kind === "order"
                  ? planMap[row.planId ?? ""]?.name ?? "Plan"
                  : row.eventTitle ?? "Evento";
              const buyerName = buyer?.email ?? row.userId;
              const amountFormatted = formatPrice(row.amountCents, row.currency);
              const receiptInfo = receiptByTransferId[row.id];
              return (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-lg)] border border-[#FCD34D] bg-[#FFFBEB] p-4 sm:p-5 ring-1 ring-[#FCD34D]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            row.kind === "order"
                              ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                              : "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]"
                          }`}
                        >
                          {row.kind === "order" ? "Plan" : "Evento"}
                        </span>
                        <h3 className="font-semibold text-[var(--color-text)] truncate">
                          {itemName}
                        </h3>
                        <span className="text-[var(--color-text)]">{amountFormatted}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        <Link
                          href={`/panel/clientes/${row.userId}`}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          {buyerName}
                        </Link>
                        {" · "}
                        Transferida {row.claimedAt.toLocaleString("es-CL")}
                      </p>
                      <div className="mt-3">
                        <TransferReceiptViewer info={receiptInfo} />
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <ApproveTransferButton
                        kind={row.kind}
                        id={row.itemId}
                        buyerName={buyerName}
                        itemName={itemName}
                        amountFormatted={amountFormatted}
                      />
                      <RejectTransferButton
                        kind={row.kind}
                        id={row.itemId}
                        itemName={itemName}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : parsed.type === "checkout" && orders.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay órdenes con los filtros seleccionados.
          </p>
        </div>
      ) : parsed.type === "manual" && manualPayments.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay pagos manuales con los filtros seleccionados.
          </p>
        </div>
      ) : parsed.type === "checkout" ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="p-3">Fecha</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Método</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Ref.</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isTransferClaimed =
                  order.paymentMethod === "TRANSFER" && order.transferClaimedAt != null;
                const methodLabel =
                  order.paymentMethod === "TRANSFER"
                    ? isTransferClaimed
                      ? "Transferencia"
                      : "Transferencia (sin confirmar)"
                    : "MercadoPago";
                const methodClass =
                  order.paymentMethod === "TRANSFER"
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "bg-[#E0F2FE] text-[#0369A1]";
                return (
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
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${methodClass}`}>
                      {methodLabel}
                    </span>
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
                );
              })}
            </tbody>
          </table>
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
                <th className="p-3">Método</th>
                <th className="p-3">Nota</th>
              </tr>
            </thead>
            <tbody>
              {manualPayments.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-3 text-[var(--color-text-muted)]">
                    {p.paidAt.toLocaleString("es-CL")}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/panel/clientes/${p.userId}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {userMap[p.userId]?.email ?? p.userId}
                    </Link>
                  </td>
                  <td className="p-3">
                    {p.planName ?? (p.userPlanId ? p.userPlanId : "Pago suelto")}
                  </td>
                  <td className="p-3">{formatPrice(p.amountCents, p.currency)}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3 text-[var(--color-text-muted)]">{p.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          href={`/panel/pagos${buildQuery(baseQuery, { page: String(Math.max(1, parsed.page - 1)) })}`}
          variant="secondary"
        >
          Anterior
        </Button>
        <Button
          href={`/panel/pagos${buildQuery(baseQuery, { page: String(parsed.page + 1) })}`}
          variant={
            parsed.type === "checkout"
              ? checkoutPage?.hasMore
                ? "primary"
                : "secondary"
              : manualPage?.hasMore
                ? "primary"
                : "secondary"
          }
        >
          Siguiente
        </Button>
      </div>

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
