"use client";

import { useState, useTransition } from "react";
import { saveInstructorBankData } from "./actions";
import { BankAccountFields } from "../plugins/transferencia/BankAccountFields";
import type { BankAccountValues } from "@/lib/ports/instructor-bank-account-repository";

export function InstructorBankAccountForm({
  instructorUserId,
  defaultValues,
}: {
  instructorUserId: string;
  defaultValues: BankAccountValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaved(false);
    startTransition(async () => {
      await saveInstructorBankData({
        instructorUserId,
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
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        Estos datos se usan para depósitos/pagos a la profesora. Son específicos por centro.
      </p>

      <BankAccountFields defaultValues={defaultValues} disabled={isPending} />

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
  );
}

