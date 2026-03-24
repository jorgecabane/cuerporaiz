"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface SuscribirmeButtonProps {
  planId: string;
  recurringDiscountPercent?: number;
}

export default function SuscribirmeButton({
  planId,
  recurringDiscountPercent,
}: SuscribirmeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al crear la suscripción");
        return;
      }
      if (data.subscriptionUrl) {
        window.location.href = data.subscriptionUrl;
        return;
      }
      setError("No se recibió URL de suscripción");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const discountLabel =
    !loading && recurringDiscountPercent != null && recurringDiscountPercent > 0
      ? ` (${recurringDiscountPercent}% desc.)`
      : "";

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={handleClick}
        className="min-h-[44px] w-full sm:w-auto cursor-pointer"
      >
        {loading ? "Redirigiendo…" : `Suscribirme${discountLabel}`}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
