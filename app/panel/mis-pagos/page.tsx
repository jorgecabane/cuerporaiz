import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { manualPaymentRepository, orderRepository, planRepository, userRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import type { OrderStatus } from "@/lib/ports";
import { ORDER_STATUS_LABELS } from "@/lib/ports";
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

export default async function PanelMisPagosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/mis-pagos");
  const centerId = session.user.centerId as string;
  const userId = session.user.id;
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
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-3 text-[var(--color-text-muted)]">
                    {order.createdAt.toLocaleString("es-CL")}
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
                </tr>
              ))}
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
                    {p.paidAt.toLocaleString("es-CL")}
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
