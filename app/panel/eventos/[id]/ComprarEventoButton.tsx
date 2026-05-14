"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { toast } from "@/components/ui/Toast";

type Mode = "purchase" | "addition";

type Props = {
  eventId: string;
  amountCents: number;
  currency: string;
  isFree: boolean;
  /** Cupos disponibles. `null` = sin límite definido por el admin. */
  availableSeats: number | null;
  /** "purchase" (default) o "addition" para re-compra. */
  mode?: Mode;
};

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
  mode = "purchase",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = useMemo(() => {
    // Si el admin no puso maxCapacity dejamos un techo razonable de 200 para
    // evitar overflows accidentales del stepper, igual el backend revalida.
    const limit = availableSeats == null ? 200 : availableSeats;
    return Math.max(1, limit);
  }, [availableSeats]);

  const total = amountCents * quantity;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, mode }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "ALREADY_PURCHASED") {
          toast.error("Ya tienes una entrada para este evento");
        } else if (data.code === "EVENT_FULL") {
          toast.error(data.message ?? "El evento está agotado");
        } else if (data.code === "INVALID_QUANTITY") {
          toast.error(data.message ?? "Cantidad de cupos inválida");
        } else if (data.code === "INVALID_MODE") {
          toast.error(data.message ?? "No se pueden agregar cupos en este momento");
        } else {
          toast.error(data.message ?? "Error al procesar");
        }
        return;
      }

      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Free event (compra inicial o addition free): éxito inline.
      toast.success(
        mode === "addition"
          ? `¡Agregaste ${quantity} ${quantity === 1 ? "cupo" : "cupos"}!`
          : "¡Inscripción confirmada!"
      );
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function getLabel(): string {
    if (loading) return isFree ? "Reservando…" : "Procesando…";
    if (mode === "addition") {
      if (isFree) return quantity === 1 ? "Agregar 1 cupo" : `Agregar ${quantity} cupos`;
      return `Agregar ${quantity} ${quantity === 1 ? "cupo" : "cupos"} — ${formatPrice(total, currency)}`;
    }
    if (isFree) return quantity > 1 ? `Reservar ${quantity} cupos` : "Reservar (gratis)";
    return `Comprar — ${formatPrice(total, currency)}`;
  }

  const showStepper = maxQuantity > 1;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {showStepper && (
        <label className="flex items-center gap-3 text-sm text-[var(--color-text)]">
          <span>Cupos</span>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={maxQuantity}
            disabled={loading}
            ariaLabel="Cantidad de cupos"
          />
        </label>
      )}
      <Button
        type="button"
        variant="primary"
        disabled={loading}
        onClick={handleClick}
        className="w-full sm:w-auto min-h-[44px]"
      >
        {getLabel()}
      </Button>
    </div>
  );
}
