"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PlanType } from "@/lib/ports";

export function ComprarPlanButton({
  planId,
  planName,
  planType,
}: {
  planId: string;
  planName: string;
  planType?: PlanType;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMembership = planType === "MEMBERSHIP";

  async function handleClick() {
    setLoading(true);
    setError(null);
    const endpoint = isMembership ? "/api/subscribe" : "/api/checkout";
    const payload = { planId };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? (isMembership ? "Error al suscribirte" : "Error al crear el checkout"));
        return;
      }
      const url = isMembership ? data.redirectUrl : data.checkoutUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setError(isMembership ? "No se recibió URL de suscripción" : "No se recibió URL de pago");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="primary"
        disabled={loading}
        onClick={handleClick}
      >
        {loading
          ? "Redirigiendo a MercadoPago…"
          : isMembership
            ? "Suscribirse"
            : "Comprar"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
