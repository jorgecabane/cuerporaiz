"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ComprarPlanButton({
  planId,
  className = "",
}: {
  planId: string;
  /** Reservado para tracking/analytics futuros; por ahora no se usa. */
  planName?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al crear el checkout");
        return;
      }
      // Centro acepta transferencia → llevamos al selector inline.
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      // Centro sólo acepta MP → redirección directa al checkout MP.
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError("No se recibió URL de pago");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col items-stretch gap-1 ${className}`}>
      <Button
        type="button"
        variant="primary"
        disabled={loading}
        onClick={handleClick}
        className="min-h-[44px] w-full sm:w-auto cursor-pointer"
      >
        {loading ? "Procesando…" : "Comprar"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
