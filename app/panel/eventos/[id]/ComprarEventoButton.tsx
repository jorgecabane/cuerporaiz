"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

type Props = {
  eventId: string;
  amountCents: number;
  currency: string;
  isFree: boolean;
  /** Cupos disponibles. `null` = sin límite. */
  availableSeats: number | null;
};

const MAX_SEATS_PER_PURCHASE = 10;

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function ComprarEventoButton({
  eventId,
  amountCents,
  currency,
  isFree,
  availableSeats,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = useMemo(() => {
    const limit = availableSeats == null ? MAX_SEATS_PER_PURCHASE : Math.min(availableSeats, MAX_SEATS_PER_PURCHASE);
    return Math.max(1, limit);
  }, [availableSeats]);

  const total = amountCents * quantity;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "ALREADY_PURCHASED") {
          toast.error("Ya tienes una entrada para este evento");
        } else if (data.code === "EVENT_FULL") {
          toast.error(data.message ?? "El evento está agotado");
        } else if (data.code === "INVALID_QUANTITY") {
          toast.error(data.message ?? "Cantidad de cupos inválida");
        } else {
          toast.error(data.message ?? "Error al procesar");
        }
        return;
      }

      // Centro acepta transferencia para eventos → selector inline.
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Free event — ticket created directly
      toast.success(quantity > 1 ? "¡Inscripción confirmada!" : "¡Inscripción confirmada!");
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
      : "Procesando…"
    : isFree
      ? quantity > 1
        ? `Reservar ${quantity} cupos`
        : "Reservar (gratis)"
      : `Comprar — ${formatPrice(total, currency)}`;

  const showSelector = maxQuantity > 1;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {showSelector && (
        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <span>Cupos</span>
          <select
            aria-label="Cantidad de cupos"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={loading}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm min-h-[44px]"
          >
            {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button
        type="button"
        variant="primary"
        disabled={loading}
        onClick={handleClick}
        className="w-full sm:w-auto min-h-[44px]"
      >
        {label}
      </Button>
    </div>
  );
}
