/* eslint-disable @next/next/no-img-element -- Comprobante user-uploaded a Sanity, URL dinámica; next/image no aplica. */
"use client";

import { useState } from "react";
import { FileText, ImageIcon, X } from "lucide-react";

interface ReceiptInfo {
  url: string;
  mimeType: string;
}

export function TransferReceiptViewer({ info }: { info: ReceiptInfo | null | undefined }) {
  const [open, setOpen] = useState(false);

  if (!info) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-white/60 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)]">
        Sin comprobante
      </span>
    );
  }

  const isImage = info.mimeType.startsWith("image/");
  const isPdf = info.mimeType === "application/pdf";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-tertiary)]"
      >
        {isImage ? (
          <ImageIcon className="size-3.5" aria-hidden />
        ) : (
          <FileText className="size-3.5" aria-hidden />
        )}
        Ver comprobante
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Comprobante de transferencia"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 hover:bg-white"
          >
            <X className="size-5" aria-hidden />
          </button>
          <div
            className="max-h-[90vh] max-w-3xl overflow-auto rounded-[var(--radius-lg)] bg-white p-2 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage ? (
              <img
                src={info.url}
                alt="Comprobante de transferencia"
                className="max-h-[80vh] max-w-full rounded object-contain"
              />
            ) : isPdf ? (
              <iframe
                src={info.url}
                title="Comprobante PDF"
                className="h-[80vh] w-[80vw] max-w-3xl rounded"
              />
            ) : (
              <div className="p-6 text-center">
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Abrir comprobante en pestaña nueva
                </a>
              </div>
            )}
            <div className="mt-3 flex justify-end gap-3 px-2 pb-2">
              <a
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Descargar archivo original
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
