"use client";

import { useState } from "react";
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

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type Tab = "active" | "history";

export function MisPlansTabs({ items }: { items: MisPlanItem[] }) {
  const [tab, setTab] = useState<Tab>("active");
  const activeItems = items.filter((i) => i.status === "ACTIVE");
  const historyItems = items.filter((i) => i.status !== "ACTIVE");
  const displayItems = tab === "active" ? activeItems : historyItems;

  return (
    <section aria-labelledby="mis-planes-heading">
      <h2
        id="mis-planes-heading"
        className="font-display text-xl font-semibold text-[var(--color-primary)] mb-4"
      >
        Mis planes
      </h2>

      {/* Tabs: touch-friendly min height, cursor-pointer, transitions */}
      <div
        className="flex rounded-[var(--radius-lg)] border border-[var(--color-border)] p-1 bg-[var(--color-surface)] mb-6"
        role="tablist"
        aria-label="Ver planes activos o históricos"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          aria-controls="mis-planes-panel"
          id="tab-active"
          onClick={() => setTab("active")}
          className={`flex-1 min-h-[44px] rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors duration-[var(--duration-normal)] cursor-pointer ${
            tab === "active"
              ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
          }`}
        >
          Activos {activeItems.length > 0 && `(${activeItems.length})`}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          aria-controls="mis-planes-panel"
          id="tab-history"
          onClick={() => setTab("history")}
          className={`flex-1 min-h-[44px] rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors duration-[var(--duration-normal)] cursor-pointer ${
            tab === "history"
              ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
          }`}
        >
          Históricos {historyItems.length > 0 && `(${historyItems.length})`}
        </button>
      </div>

      <div
        id="mis-planes-panel"
        role="tabpanel"
        aria-labelledby={tab === "active" ? "tab-active" : "tab-history"}
      >
        {displayItems.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 border border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)]">
              {tab === "active"
                ? "No tienes planes activos. Compra uno más abajo."
                : "No hay planes en el historial."}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {displayItems.map((item) => {
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
                    <h3 className="font-semibold text-[var(--color-text)]">
                      {item.planName}
                    </h3>
                    {item.isRecurring && (
                      <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                        Recurrente
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {statusLabel}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Válido desde {formatDate(item.validFrom)} hasta{" "}
                    {validUntilText}
                  </p>

                  {/* Clases: restantes + mini barra o "ilimitadas" */}
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
                            width: `${Math.min(
                              100,
                              (item.classesUsed / item.classesTotal) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                      Clases ilimitadas
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
