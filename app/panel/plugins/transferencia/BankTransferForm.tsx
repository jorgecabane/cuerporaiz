"use client";

import { useTransition, useState } from "react";
import { toggleBankTransfer, saveBankData } from "../actions";
import type { Center } from "@/lib/domain";

const BANKS = [
  "Banco de Chile",
  "Banco Estado",
  "Banco Santander",
  "BCI",
  "Banco Itaú",
  "Scotiabank",
  "Banco Falabella",
  "Banco Ripley",
  "Banco Security",
  "Banco BICE",
  "Banco Consorcio",
  "Banco Internacional",
  "HSBC",
  "Banco BTG Pactual",
  "Coopeuch",
  "MACH (BCI)",
  "Tenpo (Prepago)",
  "Mercado Pago",
];

const ACCOUNT_TYPES = [
  "Cuenta Corriente",
  "Cuenta Vista",
  "Cuenta de Ahorro",
  "Cuenta RUT",
  "Chequera Electrónica",
];

interface Props {
  center: Center;
}

export function BankTransferForm({ center }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const enabled = center.bankTransferEnabled;

  function handleToggle() {
    startTransition(() => toggleBankTransfer(center.id, !enabled));
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaved(false);
    startTransition(async () => {
      await saveBankData({
        centerId: center.id,
        bankName: (fd.get("bankName") as string) || null,
        bankAccountType: (fd.get("bankAccountType") as string) || null,
        bankAccountNumber: (fd.get("bankAccountNumber") as string) || null,
        bankAccountHolder: (fd.get("bankAccountHolder") as string) || null,
        bankAccountRut: (fd.get("bankAccountRut") as string) || null,
        bankAccountEmail: (fd.get("bankAccountEmail") as string) || null,
      });
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Estado</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isPending
              ? "Guardando..."
              : enabled
                ? "Desactivar"
                : "Activar"}
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">
            {enabled
              ? "Activo: las alumnas verán tus datos bancarios como opción de pago"
              : "Desactivado"}
          </span>
        </div>
      </div>

      {enabled && (
        <form onSubmit={handleSave} className="space-y-4 border-t border-[var(--color-border,#e5e7eb)] pt-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Estos datos se muestran a las alumnas que elijan pagar por transferencia.
          </p>

          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Banco
            </label>
            <select
              id="bankName"
              name="bankName"
              defaultValue={center.bankName ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="">Seleccionar...</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bankAccountType" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Tipo de cuenta
            </label>
            <select
              id="bankAccountType"
              name="bankAccountType"
              defaultValue={center.bankAccountType ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="">Seleccionar...</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Nro. de cuenta
            </label>
            <input
              id="bankAccountNumber"
              name="bankAccountNumber"
              type="text"
              defaultValue={center.bankAccountNumber ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div>
            <label htmlFor="bankAccountHolder" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Titular
            </label>
            <input
              id="bankAccountHolder"
              name="bankAccountHolder"
              type="text"
              defaultValue={center.bankAccountHolder ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div>
            <label htmlFor="bankAccountRut" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              RUT del titular
            </label>
            <input
              id="bankAccountRut"
              name="bankAccountRut"
              type="text"
              defaultValue={center.bankAccountRut ?? ""}
              placeholder="Ej: 12.345.678-9"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div>
            <label htmlFor="bankAccountEmail" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Email de notificación
            </label>
            <input
              id="bankAccountEmail"
              name="bankAccountEmail"
              type="email"
              defaultValue={center.bankAccountEmail ?? ""}
              placeholder="pagos@micentro.cl"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar datos bancarios"}
            </button>
            {saved && (
              <span className="text-sm text-[var(--color-success,#16a34a)]">Guardado</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
