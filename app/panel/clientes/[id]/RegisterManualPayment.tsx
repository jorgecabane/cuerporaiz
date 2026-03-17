"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserPlanOption {
  id: string;
  planName: string;
}

interface Props {
  userId: string;
  userPlans: UserPlanOption[];
}

const METHODS = [
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

export function RegisterManualPayment({ userId, userPlans }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amountRaw = fd.get("amount") as string;
    const amount = Math.round(Number(amountRaw));
    if (!amount || amount <= 0) return;

    const userPlanId = (fd.get("userPlanId") as string) || null;
    const method = fd.get("method") as string;
    const note = (fd.get("note") as string)?.trim() || null;

    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/manual-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        userPlanId: userPlanId || null,
        amountCents: amount,
        method,
        note,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar pago");
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
        + Registrar pago manual
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
      <p className="text-sm font-medium">Registrar pago manual</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="mp-amount" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Monto (CLP)
          </label>
          <input id="mp-amount" name="amount" type="number" min={1} required className={inputCls} />
        </div>
        <div>
          <label htmlFor="mp-method" className="block text-xs font-medium text-[var(--color-text)] mb-1">
            Método
          </label>
          <select id="mp-method" name="method" defaultValue="transfer" className={inputCls}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="mp-plan" className="block text-xs font-medium text-[var(--color-text)] mb-1">
          Asociar a plan (opcional)
        </label>
        <select id="mp-plan" name="userPlanId" defaultValue="" className={inputCls}>
          <option value="">Sin asociar (pago suelto)</option>
          {userPlans.map((up) => (
            <option key={up.id} value={up.id}>
              {up.planName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mp-note" className="block text-xs font-medium text-[var(--color-text)] mb-1">
          Nota (opcional)
        </label>
        <input
          id="mp-note"
          name="note"
          type="text"
          placeholder="Ej: Cuota 1/3 Plan Mensual"
          className={inputCls}
        />
      </div>

      {error && <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Registrar pago"}
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
