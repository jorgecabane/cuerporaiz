"use client";

import { useState } from "react";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import { USER_PLAN_STATUS_LABELS } from "@/lib/domain/user-plan";
import type { UserPlanStatus } from "@/lib/domain/user-plan";

export interface MisPlanItem {
  id: string;
  planId: string;
  planName: string;
  status: UserPlanStatus;
  /** Si true, este plan fue activado por una suscripción recurrente (MP). */
  isRecurring?: boolean;
  classesTotal: number | null;
  classesUsed: number;
  validFrom: string;
  validUntil: string | null;
}

export interface PendingTransferItem {
  id: string;
  kind: "plan" | "event";
  itemName: string;
  amountCents: number;
  /** ISO de cuando la alumna marcó "ya transferí" */
  claimedAt: string;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatAmount(cents: number) {
  return `$${new Intl.NumberFormat("es-CL").format(cents)}`;
}

type Tab = "active" | "pending" | "history";

export function MisPlansTabs({
  items,
  pendingTransfers = [],
}: {
  items: MisPlanItem[];
  pendingTransfers?: PendingTransferItem[];
}) {
  const hasPending = pendingTransfers.length > 0;
  const [tab, setTab] = useState<Tab>(hasPending ? "pending" : "active");
  const activeItems = items.filter((i) => i.status === "ACTIVE");
  const historyItems = items.filter((i) => i.status !== "ACTIVE");

  return (
    <section aria-labelledby="mis-planes-heading">
      <h2
        id="mis-planes-heading"
        className="font-display text-xl font-semibold text-[var(--color-primary)] mb-4"
      >
        Mis planes
      </h2>

      <div
        className="flex rounded-[var(--radius-lg)] border border-[var(--color-border)] p-1 bg-[var(--color-surface)] mb-6"
        role="tablist"
        aria-label="Ver planes activos, pendientes o históricos"
      >
        <TabButton
          label={`Activos${activeItems.length > 0 ? ` (${activeItems.length})` : ""}`}
          tab="active"
          current={tab}
          onClick={() => setTab("active")}
        />
        {hasPending && (
          <TabButton
            label={`Pendientes (${pendingTransfers.length})`}
            tab="pending"
            current={tab}
            onClick={() => setTab("pending")}
            highlight
          />
        )}
        <TabButton
          label={`Históricos${historyItems.length > 0 ? ` (${historyItems.length})` : ""}`}
          tab="history"
          current={tab}
          onClick={() => setTab("history")}
        />
      </div>

      <div
        id="mis-planes-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "active" && <PlansList items={activeItems} kind="active" />}
        {tab === "pending" && <PendingTransfersList items={pendingTransfers} />}
        {tab === "history" && <PlansList items={historyItems} kind="history" />}
      </div>
    </section>
  );
}

function TabButton({
  label,
  tab,
  current,
  onClick,
  highlight,
}: {
  label: string;
  tab: Tab;
  current: Tab;
  onClick: () => void;
  highlight?: boolean;
}) {
  const selected = tab === current;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls="mis-planes-panel"
      id={`tab-${tab}`}
      onClick={onClick}
      className={`flex-1 min-h-[44px] rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors duration-[var(--duration-normal)] cursor-pointer ${
        selected
          ? highlight
            ? "bg-[#FBBF24] text-[#78350F]"
            : "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          : highlight
            ? "text-[#92400E] hover:bg-[#FEF3C7]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
      }`}
    >
      {label}
    </button>
  );
}

function PlansList({ items, kind }: { items: MisPlanItem[]; kind: "active" | "history" }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 border border-[var(--color-border)]">
        <p className="text-[var(--color-text-muted)]">
          {kind === "active"
            ? "No tienes planes activos. Compra uno más abajo."
            : "No hay planes en el historial."}
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const statusLabel = USER_PLAN_STATUS_LABELS[item.status];
        const borderColor =
          item.status === "ACTIVE"
            ? "border-l-[var(--color-success)]"
            : "border-l-[var(--color-border)]";
        const remaining =
          item.classesTotal != null
            ? Math.max(0, item.classesTotal - item.classesUsed)
            : null;
        const validUntilText = item.validUntil
          ? formatDate(item.validUntil)
          : "Sin vencimiento";
        return (
          <li
            key={item.id}
            className={`rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-[var(--shadow-md)] border border-[var(--color-border)] border-l-4 ${borderColor}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[var(--color-text)]">{item.planName}</h3>
              {item.isRecurring && (
                <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                  Recurrente
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{statusLabel}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Válido desde {formatDate(item.validFrom)} hasta {validUntilText}
            </p>

            {item.classesTotal != null ? (
              <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-tertiary)] p-3">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Quedan{" "}
                  <span className="text-[var(--color-primary)]">
                    {remaining} {remaining === 1 ? "clase" : "clases"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {item.classesUsed} de {item.classesTotal} usadas
                </p>
                <div
                  className="mt-2 h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={item.classesUsed}
                  aria-valuemin={0}
                  aria-valuemax={item.classesTotal}
                  aria-label={`${item.classesUsed} de ${item.classesTotal} clases usadas`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-[var(--duration-normal)]"
                    style={{
                      width: `${Math.min(100, (item.classesUsed / item.classesTotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Clases ilimitadas</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PendingTransfersList({ items }: { items: PendingTransferItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start gap-3 rounded-[var(--radius-lg)] border border-[#FCD34D] bg-[#FFFBEB] p-4 sm:p-5"
        >
          <Hourglass className="mt-1 size-5 shrink-0 text-[#92400E]" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#78350F] truncate">{item.itemName}</h3>
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#78350F]">
                Esperando confirmación
              </span>
            </div>
            <p className="mt-1 text-sm text-[#92400E]">
              {formatAmount(item.amountCents)} · enviada {formatDate(item.claimedAt)}
            </p>
          </div>
          <Link
            href="/panel/mis-pagos"
            className="text-xs font-medium text-[#78350F] underline-offset-2 hover:underline"
          >
            Ver pago →
          </Link>
        </li>
      ))}
    </ul>
  );
}
