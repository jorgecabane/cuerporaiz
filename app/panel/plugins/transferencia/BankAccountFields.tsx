"use client";

export const BANKS = [
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

export const ACCOUNT_TYPES = [
  "Cuenta Corriente",
  "Cuenta Vista",
  "Cuenta de Ahorro",
  "Cuenta RUT",
  "Chequera Electrónica",
];

export interface BankAccountValues {
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  bankAccountRut?: string | null;
  bankAccountEmail?: string | null;
}

export function BankAccountFields({
  defaultValues,
  disabled,
}: {
  defaultValues: BankAccountValues;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="bankName" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Banco
        </label>
        <select
          id="bankName"
          name="bankName"
          defaultValue={defaultValues.bankName ?? ""}
          disabled={disabled}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
        >
          <option value="">Seleccionar...</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
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
          defaultValue={defaultValues.bankAccountType ?? ""}
          disabled={disabled}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
        >
          <option value="">Seleccionar...</option>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
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
          defaultValue={defaultValues.bankAccountNumber ?? ""}
          disabled={disabled}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
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
          defaultValue={defaultValues.bankAccountHolder ?? ""}
          disabled={disabled}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
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
          defaultValue={defaultValues.bankAccountRut ?? ""}
          disabled={disabled}
          placeholder="Ej: 12.345.678-9"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
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
          defaultValue={defaultValues.bankAccountEmail ?? ""}
          disabled={disabled}
          placeholder="pagos@micentro.cl"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
        />
      </div>
    </div>
  );
}

