"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

type Props = {
  eventId: string;
  amountCents: number;
  currency: string;
  isFree: boolean;
};

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function ComprarEventoButton({ eventId, amountCents, currency, isFree }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "ALREADY_PURCHASED") {
          toast.error("Ya tienes una entrada para este evento");
        } else if (data.code === "EVENT_FULL") {
          toast.error("El evento está agotado");
        } else {
          toast.error(data.message ?? "Error al procesar");
        }
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Free event — ticket created directly
      toast.success("¡Inscripción confirmada!");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const label = loading
    ? isFree
      ? "Reservando…"
      : "Redirigiendo a MercadoPago…"
    : isFree
      ? "Reservar (gratis)"
      : `Comprar — ${formatPrice(amountCents, currency)}`;

  return (
    <Button
      type="button"
      variant="primary"
      disabled={loading}
      onClick={handleClick}
      className="w-full sm:w-auto min-h-[44px]"
    >
      {label}
    </Button>
  );
}
