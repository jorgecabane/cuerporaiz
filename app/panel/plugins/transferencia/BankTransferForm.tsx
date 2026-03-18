"use client";

import { useTransition, useState } from "react";
import { toggleBankTransfer, saveBankData } from "../actions";
import type { Center } from "@/lib/domain";
import { BankAccountFields } from "./BankAccountFields";

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
              ? "Activo: los estudiantes verán tus datos bancarios como opción de pago"
              : "Desactivado"}
          </span>
        </div>
      </div>

      {enabled && (
        <form onSubmit={handleSave} className="space-y-4 border-t border-[var(--color-border,#e5e7eb)] pt-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Estos datos se muestran a los estudiantes que elijan pagar por transferencia.
          </p>

          <BankAccountFields
            defaultValues={{
              bankName: center.bankName,
              bankAccountType: center.bankAccountType,
              bankAccountNumber: center.bankAccountNumber,
              bankAccountHolder: center.bankAccountHolder,
              bankAccountRut: center.bankAccountRut,
              bankAccountEmail: center.bankAccountEmail,
            }}
            disabled={isPending}
          />

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
