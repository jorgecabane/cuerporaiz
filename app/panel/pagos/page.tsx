import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { manualPaymentRepository, planRepository, userRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { Button } from "@/components/ui/Button";
import { ApproveOrderForm } from "./ApproveOrderForm";
import { ApproveTransferButton, RejectTransferButton } from "./TransferActions";
import { TransferReceiptViewer } from "./TransferReceiptViewer";
import { getTransferReceiptInfo } from "@/lib/application/get-transfer-receipt-info";
import type { OrderStatus } from "@/lib/ports";
import { ORDER_STATUS_LABELS, EVENT_TICKET_STATUS_LABELS } from "@/lib/ports";
import { isAdminRole } from "@/lib/domain";
import type { EventTicketStatus } from "@/lib/domain/event";
import {
  computeDateRangeUtc,
  parsePaymentsSearchParams,
  type PaymentsPaymentKind,
} from "@/lib/panel/payments-query";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";

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
  /** Para tickets: cantidad de cupos comprados (default 1). */
  quantity?: number;
}

interface CheckoutLogRow {
  id: string; // `order-<id>` o `ticket-<id>`
  kind: "order" | "ticket";
  itemId: string;
  createdAt: Date;
  userId: string;
  amountCents: number;
  currency: string;
  paymentMethod: "MERCADOPAGO" | "TRANSFER";
  transferClaimedAt: Date | null;
  statusLabel: string;
  rawStatus: string;
  externalReference: string | null;
  /** Solo orders */
  planId?: string;
  /** Solo tickets */
  eventTitle?: string;
  /** Solo tickets */
  quantity?: number;
}

interface CheckoutLogResult {
  rows: CheckoutLogRow[];
  hasMore: boolean;
}

/**
 * Carga el histórico unificado de checkout: Orders (planes) + EventTickets (eventos).
 * Paginación in-memory: se traen `take * page + 1` filas de cada lado, se mezclan
 * por createdAt desc y se hace slice del rango pedido. Aceptable para los
 * volúmenes actuales del centro (~decenas/mes). Si crece a cientos por página,
 * habría que refactorizar a un cursor compuesto a nivel SQL.
 */
async function loadCheckoutPaymentsLog(
  centerId: string,
  filters: {
    paymentKind?: PaymentsPaymentKind;
    status?: OrderStatus;
    email?: string;
    from?: Date;
    to?: Date;
    page: number;
    take: number;
  },
): Promise<CheckoutLogResult> {
  const take = Math.max(1, Math.min(100, filters.take));
  const page = Math.max(1, Math.floor(filters.page));
  const skip = (page - 1) * take;
  const fetchLimit = skip + take + 1;

  const emailFilter =
    filters.email != null && filters.email !== ""
      ? { contains: filters.email, mode: "insensitive" as const }
      : null;
  const dateFilter =
    filters.from || filters.to
      ? {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to && { lte: filters.to }),
        }
      : null;

  const wantOrders = filters.paymentKind !== "event";
  const wantTickets = filters.paymentKind !== "plan";

  const [orders, tickets] = await Promise.all([
    wantOrders
      ? prisma.order.findMany({
          where: {
            centerId,
            ...(filters.status != null && { status: filters.status }),
            ...(dateFilter && { createdAt: dateFilter }),
            ...(emailFilter && { user: { email: emailFilter } }),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: fetchLimit,
        })
      : Promise.resolve([] as never[]),
    wantTickets
      ? prisma.eventTicket.findMany({
          where: {
            event: { centerId },
            // El dropdown Estado sigue el enum Order; cuando se mezclan ambos
            // lados, los tickets no se filtran por estado (ver doc del filtro).
            ...(dateFilter && { createdAt: dateFilter }),
            ...(emailFilter && { user: { email: emailFilter } }),
          },
          include: { event: { select: { title: true } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: fetchLimit,
        })
      : Promise.resolve([] as never[]),
  ]);

  const orderRows: CheckoutLogRow[] = orders.map((o) => ({
    id: `order-${o.id}`,
    kind: "order",
    itemId: o.id,
    createdAt: o.createdAt,
    userId: o.userId,
    amountCents: o.amountCents,
    currency: o.currency,
    paymentMethod: o.paymentMethod,
    transferClaimedAt: o.transferClaimedAt,
    statusLabel: ORDER_STATUS_LABELS[o.status as OrderStatus],
    rawStatus: o.status,
    externalReference: o.externalReference,
    planId: o.planId,
  }));
  const ticketRows: CheckoutLogRow[] = tickets.map((t) => ({
    id: `ticket-${t.id}`,
    kind: "ticket",
    itemId: t.id,
    createdAt: t.createdAt,
    userId: t.userId,
    amountCents: t.amountCents,
    currency: t.currency,
    paymentMethod: t.paymentMethod,
    transferClaimedAt: t.transferClaimedAt,
    statusLabel: EVENT_TICKET_STATUS_LABELS[t.status as EventTicketStatus],
    rawStatus: t.status,
    externalReference: t.externalReference,
    eventTitle: t.event?.title,
    quantity: t.quantity,
  }));

  const combined = [...orderRows, ...ticketRows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const sliced = combined.slice(skip, skip + take);
  const hasMore = combined.length > skip + take;
  return { rows: sliced, hasMore };
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
      // Necesitamos `quantity` para que el admin vea cuántos cupos paga la transferencia.
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
    quantity: t.quantity,
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
  const tz = await getCenterTimezone(centerId);
  const raw = await searchParams;
  const parsed = parsePaymentsSearchParams({
    type: raw.type,
    status: raw.status,
    email: raw.email,
    datePreset: raw.datePreset,
    from: raw.from,
    to: raw.to,
    page: raw.page,
    paymentKind: raw.paymentKind,
  });
  const dateRange = computeDateRangeUtc({
    datePreset: parsed.datePreset,
    from: parsed.from,
    to: parsed.to,
  });
  // El filtro Tipo solo aplica a Checkout y Manual; en Transferencias el badge ya diferencia.
  const effectivePaymentKind =
    parsed.type === "transfers" ? undefined : parsed.paymentKind;
  const baseQuery: Record<string, string | undefined> = {
    type: parsed.type,
    status: parsed.type === "checkout" ? parsed.status : undefined,
    email: parsed.email,
    datePreset: parsed.datePreset,
    from: parsed.datePreset === "custom" ? parsed.from : undefined,
    to: parsed.datePreset === "custom" ? parsed.to : undefined,
    paymentKind: effectivePaymentKind,
    page: String(parsed.page),
  };

  const take = 20;
  // El filtro Estado solo aplica a checkout y al lado Orders. Con Tipo = Evento
  // se descarta porque el enum Order no aplica a tickets.
  const statusFilter =
    parsed.type === "checkout" &&
    parsed.status &&
    effectivePaymentKind !== "event"
      ? (parsed.status as OrderStatus)
      : undefined;

  const checkoutLog =
    parsed.type === "checkout"
      ? await loadCheckoutPaymentsLog(centerId, {
          paymentKind: effectivePaymentKind,
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
          paymentKind: effectivePaymentKind,
          from: dateRange?.from,
          to: dateRange?.to,
          page: parsed.page,
          take,
        })
      : null;

  const checkoutRows = checkoutLog?.rows ?? [];
  const manualPayments = manualPage?.items ?? [];

  // Transferencias por revisar: orders + tickets pendientes con claim hecho.
  const transfersList =
    parsed.type === "transfers"
      ? await loadPendingTransfers(centerId)
      : [];

  const userIdsBase =
    parsed.type === "checkout"
      ? checkoutRows.map((x) => x.userId)
      : parsed.type === "manual"
        ? manualPayments.map((x) => x.userId)
        : transfersList.map((t) => t.userId);
  const userIds = [...new Set(userIdsBase)];
  const planIds =
    parsed.type === "checkout"
      ? [
          ...new Set(
            checkoutRows
              .filter((r) => r.kind === "order")
              .map((r) => r.planId)
              .filter((id): id is string => Boolean(id)),
          ),
        ]
      : parsed.type === "transfers"
        ? [
            ...new Set(
              transfersList
                .filter((t) => t.kind === "order")
                .map((t) => t.planId)
                .filter((id): id is string => Boolean(id)),
            ),
          ]
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
                disabled={
                  parsed.type !== "checkout" || effectivePaymentKind === "event"
                }
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

          {parsed.type !== "transfers" && (
            <div className="mt-3 md:max-w-xs">
              <label
                htmlFor="paymentKind"
                className="block text-sm font-medium text-[var(--color-text)] mb-1"
              >
                Tipo
              </label>
              <select
                id="paymentKind"
                name="paymentKind"
                defaultValue={effectivePaymentKind ?? ""}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value="">Todos</option>
                <option value="plan">Solo planes</option>
                <option value="event">Solo eventos</option>
              </select>
            </div>
          )}

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
              const ticketQuantitySuffix =
                row.kind === "ticket" && row.quantity != null && row.quantity > 1
                  ? ` · ${row.quantity} cupos`
                  : "";
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
                          {ticketQuantitySuffix}
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
                        Transferida {row.claimedAt.toLocaleString("es-CL", { timeZone: tz })}
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
      ) : parsed.type === "checkout" && checkoutRows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay pagos con los filtros seleccionados.
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
                <th className="p-3">Ítem</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Método</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Ref.</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {checkoutRows.map((row) => {
                const isTransferClaimed =
                  row.paymentMethod === "TRANSFER" && row.transferClaimedAt != null;
                const methodLabel =
                  row.paymentMethod === "TRANSFER"
                    ? isTransferClaimed
                      ? "Transferencia"
                      : "Transferencia (sin confirmar)"
                    : "MercadoPago";
                const methodClass =
                  row.paymentMethod === "TRANSFER"
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "bg-[#E0F2FE] text-[#0369A1]";
                const itemName =
                  row.kind === "order"
                    ? planMap[row.planId ?? ""]?.name ?? row.planId ?? "Plan"
                    : row.eventTitle ?? "Evento";
                const quantitySuffix =
                  row.kind === "ticket" && row.quantity != null && row.quantity > 1
                    ? ` · ${row.quantity} cupos`
                    : "";
                const kindBadgeClass =
                  row.kind === "order"
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]";
                return (
                  <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 text-[var(--color-text-muted)]">
                      {row.createdAt.toLocaleString("es-CL", { timeZone: tz })}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/panel/clientes/${row.userId}`}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {userMap[row.userId]?.email ?? row.userId}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${kindBadgeClass}`}
                        >
                          {row.kind === "order" ? "Plan" : "Evento"}
                        </span>
                        <span>
                          {itemName}
                          {quantitySuffix}
                        </span>
                      </span>
                    </td>
                    <td className="p-3">
                      {formatPrice(row.amountCents, row.currency)}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${methodClass}`}>
                        {methodLabel}
                      </span>
                    </td>
                    <td className="p-3">{row.statusLabel}</td>
                    <td className="p-3 font-mono text-xs">
                      {row.externalReference ?? "—"}
                    </td>
                    <td className="p-3">
                      {row.kind === "order" && row.rawStatus === "PENDING" && (
                        <ApproveOrderForm orderId={row.itemId} />
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
                <th className="p-3">Ítem</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Método</th>
                <th className="p-3">Nota</th>
              </tr>
            </thead>
            <tbody>
              {manualPayments.map((p) => {
                const itemKind: "plan" | "event" | "loose" = p.eventTicketId
                  ? "event"
                  : p.userPlanId
                    ? "plan"
                    : "loose";
                const itemName =
                  itemKind === "event"
                    ? p.eventTitle ?? "Evento"
                    : itemKind === "plan"
                      ? p.planName ?? p.userPlanId ?? "Plan"
                      : "Pago suelto";
                const kindBadgeClass =
                  itemKind === "event"
                    ? "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]"
                    : "bg-[var(--color-primary-light)] text-[var(--color-primary)]";
                return (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 text-[var(--color-text-muted)]">
                      {p.paidAt.toLocaleString("es-CL", { timeZone: tz })}
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
                      <span className="flex flex-wrap items-center gap-2">
                        {itemKind !== "loose" && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${kindBadgeClass}`}
                          >
                            {itemKind === "event" ? "Evento" : "Plan"}
                          </span>
                        )}
                        <span>{itemName}</span>
                      </span>
                    </td>
                    <td className="p-3">{formatPrice(p.amountCents, p.currency)}</td>
                    <td className="p-3">{p.method}</td>
                    <td className="p-3 text-[var(--color-text-muted)]">{p.note ?? "—"}</td>
                  </tr>
                );
              })}
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
              ? checkoutLog?.hasMore
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
