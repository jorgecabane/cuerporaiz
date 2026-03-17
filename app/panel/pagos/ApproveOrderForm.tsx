"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { approveOrderManually } from "./actions";

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  other: "Otro",
};

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors duration-[var(--duration-normal)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]";

export function ApproveOrderForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[var(--radius-md)] bg-[var(--color-success)] px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[var(--color-success-hover)]"
      >
        Aprobar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-order-title"
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="approve-order-title"
              className="text-lg font-semibold text-[var(--color-text)] mb-4"
            >
              Registrar datos del pago
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Conciliación manual: indicá método y opcionalmente una nota para dejar registrado.
            </p>

            <form action={approveOrderManually} className="space-y-4">
              <input type="hidden" name="orderId" value={orderId} readOnly />

              <div>
                <label
                  htmlFor={`approve-method-${orderId}`}
                  className="block text-sm font-medium text-[var(--color-text)] mb-1"
                >
                  Método de pago
                </label>
                <select
                  id={`approve-method-${orderId}`}
                  name="method"
                  defaultValue="transfer"
                  className={inputCls}
                  required
                >
                  {Object.entries(METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`approve-note-${orderId}`}
                  className="block text-sm font-medium text-[var(--color-text)] mb-1"
                >
                  Nota <span className="text-[var(--color-text-muted)]">(opcional)</span>
                </label>
                <input
                  id={`approve-note-${orderId}`}
                  name="note"
                  type="text"
                  placeholder="Ej: Transferencia recibida 15/03"
                  className={inputCls}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-border)]"
                >
                  Cancelar
                </button>
                <ApproveSubmitButton onCancel={() => setOpen(false)} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ApproveSubmitButton({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-[var(--radius-md)] bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-success-hover)] disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Confirmar"}
    </button>
  );
}
