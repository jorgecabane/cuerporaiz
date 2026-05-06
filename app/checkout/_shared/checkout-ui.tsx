/* eslint-disable @next/next/no-img-element -- Logos de marca chicos en /public; next/image es overkill para SVGs estáticos. */
"use client";

import { Copy, Check, Upload, X, AlertCircle } from "lucide-react";

export interface BankData {
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
}

const PESO_FORMATTER = new Intl.NumberFormat("es-CL");

export function formatAmount(cents: number): string {
  return `$${PESO_FORMATTER.format(cents)}`;
}

export function buildBankClipboardText(bank: BankData): string {
  const lines = [
    bank.bankName && `Banco: ${bank.bankName}`,
    bank.bankAccountType && `Tipo: ${bank.bankAccountType}`,
    bank.bankAccountNumber && `Número: ${bank.bankAccountNumber}`,
    bank.bankAccountHolder && `Titular: ${bank.bankAccountHolder}`,
    bank.bankAccountRut && `RUT: ${bank.bankAccountRut}`,
    bank.bankAccountEmail && `Email: ${bank.bankAccountEmail}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export const ALLOWED_RECEIPT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

// ── Cards y estilos compartidos ─────────────────────────────────────────────

export function MethodCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  right,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-3 overflow-hidden rounded-[var(--radius-md)] border transition-all ${
        selected
          ? "border-[var(--color-text)] shadow-[0_0_0_2px_rgba(28,28,26,0.08)]"
          : "border-[var(--color-border)] hover:border-[#b8b8b8]"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        aria-pressed={selected}
      >
        <span
          className={`flex size-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-[var(--color-text)]" : "border-[#b8b8b8]"
          }`}
        >
          {selected && <span className="size-2.5 rounded-full bg-[var(--color-text)]" />}
        </span>
        <span className="flex flex-shrink-0">{icon}</span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold text-[var(--color-text)]">{title}</span>
          <span className="mt-0.5 block text-[13px] text-[var(--color-text-muted)]">{subtitle}</span>
        </span>
        {right && <span className="ml-auto flex-shrink-0">{right}</span>}
      </button>
      {selected && (
        <div className="border-t border-[#ECEAE6] px-5 pb-5 pt-4">{children}</div>
      )}
    </div>
  );
}

export function BankDetailsCard({
  bank,
  copied,
  onCopyAll,
}: {
  bank: BankData;
  copied: boolean;
  onCopyAll: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[#F7F7F4] px-4 py-3">
        <span className="text-[13px] font-semibold text-[var(--color-text)]">Cuenta de destino</span>
        <button
          type="button"
          onClick={onCopyAll}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-medium transition-colors ${
            copied
              ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
              : "border-[var(--color-text)] bg-white text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-white"
          }`}
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copiado" : "Copiar todos"}
        </button>
      </div>
      <dl className="px-4 py-1">
        <BankRow label="Banco" value={bank.bankName} />
        <BankRow label="Tipo" value={bank.bankAccountType} />
        <BankRow label="Número" value={bank.bankAccountNumber} />
        <BankRow label="Titular" value={bank.bankAccountHolder} />
        <BankRow label="RUT" value={bank.bankAccountRut} />
        <BankRow label="Email" value={bank.bankAccountEmail} last />
      </dl>
    </div>
  );
}

function BankRow({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[110px_1fr] py-2.5 text-sm ${
        last ? "" : "border-b border-[#F0EFEB]"
      }`}
    >
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="font-mono text-[13px] text-[var(--color-text)] break-all">{value ?? "—"}</dd>
    </div>
  );
}

export function AmountStrip({
  amountCents,
  copied,
  onCopy,
}: {
  amountCents: number;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-4 text-white">
      <div>
        <div className="text-[11px] uppercase tracking-[.08em] opacity-70">Monto exacto</div>
        <div className="mt-1 font-mono text-[22px] font-semibold leading-tight">
          {formatAmount(amountCents)}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-medium transition-colors ${
          copied
            ? "border-white bg-white text-[var(--color-primary)]"
            : "border-white/60 bg-transparent text-white hover:bg-white/15"
        }`}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copiado" : `Copiar ${amountCents}`}
      </button>
    </div>
  );
}

export function ReceiptDropZone({
  uploading,
  fileName,
  onSelect,
  onClear,
  error,
}: {
  uploading: boolean;
  fileName: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  error: string | null;
}) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = "";
  }

  if (fileName) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[#F0FDF4] px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-[var(--color-success-hover)] truncate">
          <Check className="size-4 flex-shrink-0" aria-hidden /> {fileName}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Quitar comprobante"
          className="ml-2 flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] bg-white px-6 py-7 text-center transition-colors hover:border-[var(--color-text)] hover:bg-[#FAFAF8] cursor-pointer">
        <Upload className="size-5 text-[var(--color-text-muted)]" aria-hidden />
        <span className="mt-1 text-sm font-semibold text-[var(--color-text)]">
          {uploading ? "Subiendo..." : "Subir comprobante"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">JPG, PNG, WebP o PDF · máx 4MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          hidden
          onChange={onChange}
          disabled={uploading}
        />
      </label>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-error-text)]">
          <AlertCircle className="size-3.5" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

export function CardBrands() {
  return (
    <span className="hidden items-center gap-1.5 sm:flex">
      <BrandIcon src="/checkout-icons/visa.svg" alt="Visa" />
      <BrandIcon src="/checkout-icons/mastercard.svg" alt="Mastercard" />
      <BrandIcon src="/checkout-icons/amex.svg" alt="American Express" />
    </span>
  );
}

function BrandIcon({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width={32} height={20} className="h-5 w-auto" />;
}

export function MercadoPagoLogo({ className }: { className?: string }) {
  return (
    <img
      src="/checkout-icons/mphands.svg"
      alt="MercadoPago"
      width={32}
      height={32}
      className={className ?? "h-6 w-auto"}
    />
  );
}

export function BankLogo({ className }: { className?: string }) {
  return (
    <img
      src="/checkout-icons/bank.svg"
      alt="Transferencia bancaria"
      width={32}
      height={20}
      className={className ?? "h-6 w-auto"}
    />
  );
}


export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-bg)] p-3 text-sm text-[var(--color-error-text)]">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
