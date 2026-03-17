"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  maxReservations: number | null;
  validityDays: number | null;
  validityPeriod: string | null;
}

interface Props {
  userId: string;
  plans: Plan[];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function AssignPlanForm({ userId, plans }: Props) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [validFrom, setValidFrom] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/user-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, planId, validFrom }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al asignar plan");
    } else {
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--color-primary)] hover:underline"
      >
        + Asignar plan manualmente
      </button>
    );
  }

  const inputCls =
    "w-full rounded-[var(--radius-md)] border border-[var(--color-border,#e5e7eb)] px-3 py-2 text-sm bg-[var(--color-surface)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border,#e5e7eb)] p-4 space-y-3"
    >
      <p className="text-sm font-medium">Asignar plan</p>
      <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.maxReservations ? ` (${p.maxReservations} clases)` : " (ilimitado)"}
          </option>
        ))}
      </select>
      <div>
        <label htmlFor="validFrom" className="block text-xs font-medium text-[var(--color-text)] mb-1">
          Activo desde
        </label>
        <input
          id="validFrom"
          type="date"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
          className={inputCls}
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        El plan quedará con pago pendiente hasta que se registre un pago.
      </p>
      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Asignando..." : "Asignar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border,#e5e7eb)] text-[var(--color-text-muted)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
