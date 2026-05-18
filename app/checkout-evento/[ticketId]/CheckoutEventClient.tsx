"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { optimizeImage } from "@/lib/client/optimize-image";
import {
  type BankData,
  formatAmount,
  buildBankClipboardText,
  ALLOWED_RECEIPT_MIME,
  MAX_RECEIPT_BYTES,
  MethodCard,
  BankDetailsCard,
  AmountStrip,
  ReceiptDropZone,
  CardBrands,
  MercadoPagoLogo,
  BankLogo,
  ErrorBanner,
} from "../../checkout/_shared/checkout-ui";
import { continueWithMercadoPagoEvent, submitTransferClaimForEvent } from "./actions";

interface Props {
  ticketId: string;
  eventTitle: string;
  eventMeta: string; // ej. "12 jun · 19:30 · Sala A"
  amountCents: number;
  centerName: string;
  bank: BankData;
  transferAvailable: boolean;
  receiptRequired: boolean;
  mpEnabled: boolean;
}

type Method = "mp" | "transfer";

export function CheckoutEventClient(props: Props) {
  const initialMethod: Method = props.mpEnabled ? "mp" : "transfer";
  const [method, setMethod] = useState<Method>(initialMethod);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [receiptDocId, setReceiptDocId] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const bankClipboardText = useMemo(
    () => buildBankClipboardText(props.bank),
    [props.bank],
  );
  const canSubmitTransfer = !props.receiptRequired || receiptDocId !== null;

  function selectMethod(next: Method) {
    if (next === method) return;
    if (next === "transfer" && !props.transferAvailable) return;
    if (next === "mp" && !props.mpEnabled) return;
    setMethod(next);
    setError(null);
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(bankClipboardText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      // ignore
    }
  }
  async function copyAmount() {
    try {
      await navigator.clipboard.writeText(String(props.amountCents));
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 1500);
    } catch {
      // ignore
    }
  }

  async function handleFileSelected(file: File) {
    setUploadError(null);
    if (!ALLOWED_RECEIPT_MIME.includes(file.type)) {
      setUploadError("Solo imágenes JPG/PNG/WebP o PDF");
      return;
    }
    // Para PDFs no optimizamos: validamos tamaño upfront contra el límite del server.
    if (file.type === "application/pdf" && file.size > MAX_RECEIPT_BYTES) {
      setUploadError("PDF supera 4MB. Prueba exportarlo en menor calidad.");
      return;
    }
    setUploading(true);
    try {
      let toUpload = file;
      if (file.type.startsWith("image/")) {
        // Comprime la imagen client-side a ~1MB / 1600px (preset transferReceipt).
        toUpload = await optimizeImage(file, "transferReceipt");
      }
      if (toUpload.size > MAX_RECEIPT_BYTES) {
        setUploadError("La imagen sigue muy grande tras optimizar. Prueba una más chica.");
        return;
      }
      const fd = new FormData();
      fd.append("file", toUpload);
      fd.append("eventTicketId", props.ticketId);
      const res = await fetch("/api/me/transfer-receipt-upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data?.error ?? "No se pudo subir el comprobante");
        return;
      }
      setReceiptDocId(data.receiptDocId as string);
      setReceiptFileName(toUpload.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function clearReceipt() {
    setReceiptDocId(null);
    setReceiptFileName(null);
    setUploadError(null);
  }

  function handleContinueMp() {
    setError(null);
    startTransition(async () => {
      const r = await continueWithMercadoPagoEvent(props.ticketId);
      if (r?.error) setError(r.error);
    });
  }

  function handleSubmitTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmitTransfer) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await submitTransferClaimForEvent(fd);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 lg:grid-cols-[1fr_380px]">
        <main className="order-2 border-b border-[var(--color-border)] px-6 py-8 sm:px-10 sm:py-10 lg:order-none lg:border-b-0 lg:border-r">
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">Pagar entrada</h1>
          <p className="mt-1 mb-7 text-sm text-[var(--color-text-muted)]">
            Elige cómo quieres pagar tu cupo.
          </p>

          <div className="mb-3 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--color-text-muted)]">
            Método de pago
          </div>

          {!props.mpEnabled && !props.transferAvailable && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-bg)] p-4 text-sm text-[var(--color-error-text)]">
              Este centro no tiene métodos de pago activos. Contacta al centro para coordinar.
            </div>
          )}

          {props.mpEnabled && (
            <MethodCard
              selected={method === "mp"}
              onClick={() => selectMethod("mp")}
              icon={<MercadoPagoLogo className="h-7 w-auto rounded-[3px]" />}
              title="Tarjeta o débito"
              subtitle="MercadoPago · pago inmediato"
              right={<CardBrands />}
            >
              <div className="rounded-[var(--radius-md)] bg-[#F7F7F4] p-4 text-sm text-[var(--color-text)]">
                Te llevaremos a <strong>MercadoPago</strong> para completar el pago de forma segura.
                Tu cupo queda confirmado apenas se apruebe el pago.
              </div>
              <button
                type="button"
                onClick={handleContinueMp}
                disabled={isPending}
                className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[#009ee3] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#007eb5] disabled:opacity-60"
              >
                {isPending ? "Conectando..." : "Continuar a MercadoPago"}
              </button>
            </MethodCard>
          )}

          {props.transferAvailable && (
            <MethodCard
              selected={method === "transfer"}
              onClick={() => selectMethod("transfer")}
              icon={<BankLogo className="h-7 w-auto" />}
              title="Transferencia bancaria"
              subtitle="Tu cupo queda reservado · el centro confirmará el pago"
            >
              <form onSubmit={handleSubmitTransfer} className="space-y-4">
                <input type="hidden" name="ticketId" value={props.ticketId} />
                {receiptDocId && <input type="hidden" name="receiptDocId" value={receiptDocId} />}

                <BankDetailsCard
                  bank={props.bank}
                  copied={copiedAll}
                  onCopyAll={copyAll}
                />

                <AmountStrip
                  amountCents={props.amountCents}
                  copied={copiedAmount}
                  onCopy={copyAmount}
                />

                {props.receiptRequired && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--color-text-muted)]">
                      Comprobante
                      <span className="text-[var(--color-error)]" aria-label="obligatorio">*</span>
                    </div>
                    <ReceiptDropZone
                      uploading={uploading}
                      fileName={receiptFileName}
                      onSelect={handleFileSelected}
                      onClear={clearReceipt}
                      error={uploadError}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || uploading || !canSubmitTransfer}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Enviando..." : "Ya transferí — confirmar"}
                </button>
                <p className="text-center text-xs text-[var(--color-text-muted)]">
                  Tu cupo queda reservado. Te avisaremos por mail cuando el centro lo apruebe.
                </p>
              </form>
            </MethodCard>
          )}

          {error && <ErrorBanner message={error} />}

          <Link
            href="/panel/eventos"
            className="mt-6 inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            ← Cancelar y volver
          </Link>
        </main>

        <aside className="order-1 bg-[#FAFAF8] px-6 py-8 sm:px-8 sm:py-10 lg:order-none">
          <div className="border-b border-[var(--color-border)] pb-3">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div>
                <div className="font-medium text-[var(--color-text)]">{props.eventTitle}</div>
                <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {props.centerName} · {props.eventMeta}
                </div>
              </div>
              <div className="text-[var(--color-text)]">{formatAmount(props.amountCents)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Subtotal</span>
            <span>{formatAmount(props.amountCents)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatAmount(props.amountCents)}</span>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Si pagas por transferencia, tu cupo queda reservado mientras el centro confirma. Si rechazan
            la transferencia, el cupo se libera automáticamente.
          </p>
        </aside>
      </div>
    </div>
  );
}
