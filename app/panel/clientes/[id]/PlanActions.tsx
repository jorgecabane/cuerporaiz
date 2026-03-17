"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userPlanId: string;
  status: string;
  paymentStatus: string;
  isLive: boolean;
}

export function PlanActions({ userPlanId, status, paymentStatus, isLive }: Props) {
  const [loading, setLoading] = useState(false);
  const [showFreeze, setShowFreeze] = useState(false);
  const [reason, setReason] = useState("");
  const [frozenUntil, setFrozenUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function doAction(body: Record<string, string>) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/user-plans/${userPlanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error");
    } else {
      setShowFreeze(false);
      router.refresh();
    }
    setLoading(false);
  }

  const btnCls =
    "text-xs px-2.5 py-1 rounded-[var(--radius-md)] border transition-colors disabled:opacity-40";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" && isLive && (
          <button
            onClick={() => setShowFreeze(true)}
            disabled={loading}
            className={`${btnCls} border-blue-300 text-blue-700 hover:bg-blue-50`}
          >
            Congelar
          </button>
        )}
        {status === "FROZEN" && (
          <button
            onClick={() => doAction({ action: "unfreeze" })}
            disabled={loading}
            className={`${btnCls} border-[var(--color-success,#16a34a)] text-[var(--color-success,#16a34a)] hover:bg-[var(--color-success-bg,#dcfce7)]`}
          >
            Descongelar
          </button>
        )}
        {(status === "ACTIVE" || status === "FROZEN") && (
          <button
            onClick={() => doAction({ action: "cancel" })}
            disabled={loading}
            className={`${btnCls} border-[var(--color-error,#dc2626)] text-[var(--color-error,#dc2626)] hover:bg-[var(--color-error-bg,#fef2f2)]`}
          >
            Cancelar plan
          </button>
        )}
        {paymentStatus !== "PAID" && (
          <button
            onClick={() => doAction({ action: "update_payment", paymentStatus: "PAID" })}
            disabled={loading}
            className={`${btnCls} border-[var(--color-success,#16a34a)] text-[var(--color-success,#16a34a)] hover:bg-[var(--color-success-bg,#dcfce7)]`}
          >
            Marcar como pagado
          </button>
        )}
        {paymentStatus === "PENDING" && (
          <button
            onClick={() => doAction({ action: "update_payment", paymentStatus: "PARTIAL" })}
            disabled={loading}
            className={`${btnCls} border-[var(--color-warning,#ca8a04)] text-[var(--color-warning,#ca8a04)] hover:bg-[var(--color-warning-bg,#fefce8)]`}
          >
            Pago parcial
          </button>
        )}
      </div>

      {showFreeze && (
        <div className="rounded-[var(--radius-md)] border border-blue-200 p-3 space-y-2 bg-blue-50/50">
          <p className="text-xs font-medium text-blue-800">Congelar plan</p>
          <input
            type="text"
            placeholder="Motivo (ej: Viaje, lesión)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm bg-white"
          />
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">
              Descongelar automáticamente el (opcional)
            </label>
            <input
              type="date"
              value={frozenUntil}
              onChange={(e) => setFrozenUntil(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                doAction({
                  action: "freeze",
                  reason,
                  ...(frozenUntil ? { frozenUntil } : {}),
                })
              }
              disabled={loading || !reason}
              className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? "..." : "Confirmar"}
            </button>
            <button
              onClick={() => setShowFreeze(false)}
              className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
    </div>
  );
}
