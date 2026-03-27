"use client";

import { useState } from "react";

export function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <p className="text-amber-800">
        Verifica tu email para acceder a todas las funciones.
      </p>
      {sent ? (
        <span className="text-xs text-amber-600">Email enviado ✓</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="text-xs font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
        >
          {sending ? "Enviando…" : "Reenviar email"}
        </button>
      )}
    </div>
  );
}
