import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  eventRepository,
  eventTicketRepository,
  manualPaymentRepository,
  orderRepository,
  planRepository,
} from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import type { OrderStatus } from "@/lib/ports";
import { ORDER_STATUS_LABELS } from "@/lib/ports";
import { computeDateRangeUtc, parsePaymentsSearchParams } from "@/lib/panel/payments-query";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

type TicketWithEvent = {
  ticket: import("@/lib/domain/event").EventTicket;
  event: import("@/lib/domain/event").Event;
};

function EventTicketCard({
  ticket,
  event,
  isPast,
  tz,
}: TicketWithEvent & { isPast: boolean; tz: string }) {
  return (
    <li>
      <Link
        href={`/panel/eventos/${event.id}`}
        className={`flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors ${
          isPast ? "opacity-70" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--color-text)]">{event.title}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
            {ticket.quantity === 1 ? "1 cupo" : `${ticket.quantity} cupos`}
          </span>
          {isPast && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              Finalizado
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {event.startsAt.toLocaleString("es-CL", {
            timeZone: tz,
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Total pagado: {formatPrice(ticket.amountCents, ticket.currency)}
        </p>
        {ticket.pendingAdditionQuantity > 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            + {ticket.pendingAdditionQuantity} cupo(s) pendiente(s) de pago
          </p>
        )}
      </Link>
    </li>
  );
}

function sortTicketsByEvent(tickets: TicketWithEvent[], nowMs: number): TicketWithEvent[] {
  return [...tickets].sort((a, b) => {
    const aFuture = a.event.startsAt.getTime() >= nowMs;
    const bFuture = b.event.startsAt.getTime() >= nowMs;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    return aFuture
      ? a.event.startsAt.getTime() - b.event.startsAt.getTime()
      : b.event.startsAt.getTime() - a.event.startsAt.getTime();
  });
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

export default async function PanelMisPagosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/mis-pagos");
  const centerId = session.user.centerId as string;
  const userId = session.user.id;
  const tz = await getCenterTimezone(centerId);
  const raw = await searchParams;
  const parsed = parsePaymentsSearchParams({
    type: raw.type,
    status: raw.status,
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
          userId,
          status: statusFilter,
          from: dateRange?.from,
          to: dateRange?.to,
          page: parsed.page,
          take,
        })
      : null;

  const manualPage =
    parsed.type === "manual"
      ? await manualPaymentRepository.findPageByCenterId(centerId, {
          userId,
          from: dateRange?.from,
          to: dateRange?.to,
          page: parsed.page,
          take,
        })
      : null;

  const orders = checkoutPage?.items ?? [];
  const manualPayments = manualPage?.items ?? [];
  const planIds = parsed.type === "checkout" ? [...new Set(orders.map((o) => o.planId))] : [];
  const plans = await (parsed.type === "checkout" ? planRepository.findManyByIds(planIds) : Promise.resolve([]));
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

  // ── Entradas a eventos (sección informativa siempre visible arriba) ──
  const userTickets = await eventTicketRepository.findByUserId(userId);
  const paidEventTickets = userTickets.filter((t) => t.status === "PAID");
  const eventIds = [...new Set(paidEventTickets.map((t) => t.eventId))];
  const events = await Promise.all(eventIds.map((id) => eventRepository.findById(id)));
  const eventMap = new Map(events.filter((e) => e != null).map((e) => [e!.id, e!]));
  const ticketsWithEvents: TicketWithEvent[] = paidEventTickets.flatMap((ticket) => {
    const event = eventMap.get(ticket.eventId);
    return event ? [{ ticket, event }] : [];
  });
  // eslint-disable-next-line react-hooks/purity -- server component runs once per request
  const nowMs = Date.now();
  const sortedTickets = sortTicketsByEvent(ticketsWithEvents, nowMs).map((tw) => ({
    ...tw,
    isPast: tw.event.startsAt.getTime() < nowMs,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/panel"
          className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Home
        </Link>
      </div>
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Mis pagos
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Tus compras por checkout y pagos manuales registrados en el centro.
      </p>

      {raw.recien && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[#F0FDF4] p-4">
          <p className="text-sm font-medium text-[var(--color-success-hover)]">
            ✓ Tu transferencia fue registrada
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Te avisaremos por mail apenas el centro la apruebe.
          </p>
        </div>
      )}

      {sortedTickets.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            Entradas a eventos
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {sortedTickets.map(({ ticket, event, isPast }) => (
              <EventTicketCard key={ticket.id} ticket={ticket} event={event} isPast={isPast} tz={tz} />
            ))}
          </ul>
        </section>
      )}

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            href={`/panel/mis-pagos${buildQuery(baseQuery, { type: "checkout", page: "1", status: parsed.status })}`}
            variant={parsed.type === "checkout" ? "primary" : "secondary"}
          >
            Checkout
          </Button>
          <Button
            href={`/panel/mis-pagos${buildQuery(baseQuery, { type: "manual", page: "1", status: undefined })}`}
            variant={parsed.type === "manual" ? "primary" : "secondary"}
          >
            Manual
          </Button>
        </div>

        <form method="get" className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]">
          <input type="hidden" name="type" value={parsed.type} />
          <input type="hidden" name="page" value="1" />

          <div className="grid gap-3 md:grid-cols-2">
            <div>
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

            <div>
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
            <Button href={`/panel/mis-pagos?type=${parsed.type}`} variant="secondary">
              Limpiar
            </Button>
            <span className="text-sm text-[var(--color-text-muted)] ml-auto">
              Página {parsed.page}
            </span>
          </div>
        </form>
      </div>

      {parsed.type === "checkout" && orders.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No tienes órdenes con los filtros seleccionados.
          </p>
        </div>
      ) : parsed.type === "manual" && manualPayments.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No tienes pagos manuales con los filtros seleccionados.
          </p>
        </div>
      ) : parsed.type === "checkout" ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="p-3">Fecha</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Ref.</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isTransferPending =
                  order.status === "PENDING" &&
                  order.paymentMethod === "TRANSFER" &&
                  order.transferClaimedAt != null;
                const isTransferRejected =
                  order.status === "CANCELLED" &&
                  order.paymentMethod === "TRANSFER" &&
                  order.transferRejectedReason != null;
                const highlight = raw.recien === order.id;
                return (
                <tr
                  key={order.id}
                  className={`border-b border-[var(--color-border)] last:border-0 ${
                    highlight ? "bg-[#F0FDF4] ring-2 ring-[var(--color-success)]" : ""
                  }`}
                >
                  <td className="p-3 text-[var(--color-text-muted)]">
                    {order.createdAt.toLocaleString("es-CL", { timeZone: tz })}
                  </td>
                  <td className="p-3">
                    {planMap[order.planId]?.name ?? order.planId}
                  </td>
                  <td className="p-3">
                    {formatPrice(order.amountCents, order.currency)}
                  </td>
                  <td className="p-3">
                    {isTransferPending ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-medium text-[#78350F]">
                        ⏳ Esperando confirmación
                      </span>
                    ) : isTransferRejected ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-error-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-error-text)]"
                        title={order.transferRejectedReason ?? undefined}
                      >
                        ✕ Rechazado
                      </span>
                    ) : (
                      ORDER_STATUS_LABELS[order.status]
                    )}
                    {isTransferRejected && order.transferRejectedReason && (
                      <p className="mt-1 max-w-[260px] text-xs text-[var(--color-text-muted)]">
                        Motivo: {order.transferRejectedReason}
                      </p>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {order.externalReference}
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
                    {p.paidAt.toLocaleString("es-CL", { timeZone: tz })}
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
          href={`/panel/mis-pagos${buildQuery(baseQuery, { page: String(Math.max(1, parsed.page - 1)) })}`}
          variant="secondary"
        >
          Anterior
        </Button>
        <Button
          href={`/panel/mis-pagos${buildQuery(baseQuery, { page: String(parsed.page + 1) })}`}
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
    </div>
  );
}
