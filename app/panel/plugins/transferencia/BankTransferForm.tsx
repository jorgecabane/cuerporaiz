"use client";

import { useTransition, useState } from "react";
import { toggleBankTransfer, saveBankData, saveBankTransferOptions } from "../actions";
import type { Center } from "@/lib/domain";
import { BankAccountFields } from "./BankAccountFields";

interface Props {
  center: Center;
}

function hasCompleteBankData(c: Center): boolean {
  return Boolean(
    c.bankName &&
      c.bankAccountType &&
      c.bankAccountNumber &&
      c.bankAccountHolder &&
      c.bankAccountRut &&
      c.bankAccountEmail
  );
}

export function BankTransferForm({ center }: Props) {
  const [isPending, startTransition] = useTransition();
  const [savedData, setSavedData] = useState(false);
  const [savedOptions, setSavedOptions] = useState(false);
  const enabled = center.bankTransferEnabled;
  const dataComplete = hasCompleteBankData(center);
  const optionsLocked = !enabled || !dataComplete;

  const [acceptPlans, setAcceptPlans] = useState(center.bankTransferAcceptPlans);
  const [acceptEvents, setAcceptEvents] = useState(center.bankTransferAcceptEvents);
  const [requireReceipt, setRequireReceipt] = useState(center.bankTransferRequireReceipt);

  function handleToggle() {
    startTransition(() => toggleBankTransfer(center.id, !enabled));
  }

  function handleSaveData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSavedData(false);
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
      setSavedData(true);
    });
  }

  function persistOptions(next: { acceptPlans: boolean; acceptEvents: boolean; requireReceipt: boolean }) {
    setSavedOptions(false);
    startTransition(async () => {
      await saveBankTransferOptions({ centerId: center.id, ...next });
      setSavedOptions(true);
    });
  }

  function onTogglePlans() {
    if (optionsLocked) return;
    const next = !acceptPlans;
    setAcceptPlans(next);
    persistOptions({ acceptPlans: next, acceptEvents, requireReceipt });
  }
  function onToggleEvents() {
    if (optionsLocked) return;
    const next = !acceptEvents;
    setAcceptEvents(next);
    persistOptions({ acceptPlans, acceptEvents: next, requireReceipt });
  }
  function onToggleReceipt() {
    if (optionsLocked) return;
    const next = !requireReceipt;
    setRequireReceipt(next);
    persistOptions({ acceptPlans, acceptEvents, requireReceipt: next });
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
              ? "Activo"
              : "Desactivado"}
          </span>
        </div>
      </div>

      {enabled && (
        <form onSubmit={handleSaveData} className="space-y-4 border-t border-[var(--color-border,#e5e7eb)] pt-5">
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
            {savedData && (
              <span className="text-sm text-[var(--color-success,#16a34a)]">Guardado</span>
            )}
          </div>
        </form>
      )}

      {enabled && (
        <div className="space-y-4 border-t border-[var(--color-border,#e5e7eb)] pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-[var(--color-text)]">Cómo se usa</h2>
            {savedOptions && !isPending && (
              <span className="text-xs text-[var(--color-success,#16a34a)]">Guardado</span>
            )}
          </div>

          {!dataComplete && (
            <p className="rounded-[var(--radius-md)] bg-[#FEF3C7] border border-[#FDE68A] px-3 py-2 text-xs text-[#78350F]">
              Completa los datos bancarios para activar las opciones de abajo.
            </p>
          )}

          <ToggleRow
            label="Permitir pagar planes con transferencia"
            checked={acceptPlans}
            disabled={optionsLocked || isPending}
            onChange={onTogglePlans}
          />

          <div>
            <ToggleRow
              label="Permitir pagar eventos con transferencia"
              checked={acceptEvents}
              disabled={optionsLocked || isPending}
              onChange={onToggleEvents}
            />
            {acceptEvents && !optionsLocked && (
              <p className="mt-2 ml-12 text-xs text-[var(--color-text-muted)] leading-relaxed">
                El cupo se reserva inmediatamente aunque la transferencia aún no esté aprobada.
                Tienes que entrar a Pagos y aprobar o rechazar las transferencias para liberar
                cupos de pagos no concretados.
              </p>
            )}
          </div>

          <ToggleRow
            label="Exigir comprobante de transferencia"
            description="Si está activo, la estudiante debe subir una imagen o PDF antes de confirmar."
            checked={requireReceipt}
            disabled={optionsLocked || isPending}
            onChange={onToggleReceipt}
          />
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="flex w-full items-start gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      aria-pressed={checked}
    >
      <span
        className={`mt-0.5 inline-flex h-6 w-10 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border,#d1d5db)]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex-1">
        <span className="block text-sm text-[var(--color-text)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{description}</span>
        )}
      </span>
    </button>
  );
}
