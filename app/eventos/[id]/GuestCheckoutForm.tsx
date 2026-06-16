"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { toast } from "@/components/ui/Toast";

type Props = {
  eventId: string;
  amountCents: number;
  currency: string;
  isFree: boolean;
  maxQuantity: number;
  loginHref: string;
};

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function GuestCheckoutForm({
  eventId,
  amountCents,
  currency,
  isFree,
  maxQuantity,
  loginHref,
}: Props) {
  const fieldId = useId();
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const total = amountCents * quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNeedsLogin(false);
    try {
      const res = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, quantity }),
      });
      const data = await res.json();

      if (res.status === 409 && data.code === "NEEDS_LOGIN") {
        setNeedsLogin(true);
        return;
      }
      if (!res.ok) {
        toast.error(data.message ?? "No pudimos procesar tu compra. Intenta de nuevo.");
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
      // No debería ocurrir en guest (siempre devuelve redirectTo/checkoutUrl).
      toast.error("No pudimos completar la compra. Intenta de nuevo.");
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? "Procesando…"
    : isFree
      ? "Confirmar reserva"
      : "Continuar al pago";

  const loginWithEmail = email
    ? `${loginHref}${loginHref.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}`
    : loginHref;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-center justify-between gap-[var(--space-4)]">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Cantidad de entradas</p>
          {!isFree && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Total:{" "}
              <span className="font-semibold text-[var(--color-primary)]">
                {formatPrice(total, currency)}
              </span>
            </p>
          )}
        </div>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={maxQuantity}
          disabled={loading}
          ariaLabel="Cantidad de entradas"
        />
      </div>

      {needsLogin && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-secondary)]/30 bg-[var(--color-secondary-light)] p-[var(--space-3)] text-sm text-[var(--color-text)]"
        >
          Ya tienes una cuenta con este correo.{" "}
          <a
            href={loginWithEmail}
            className="font-semibold text-[var(--color-secondary)] underline underline-offset-2"
          >
            Inicia sesión para continuar →
          </a>
        </div>
      )}

      <div className="flex flex-col gap-[var(--space-3)]">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-name`} className="text-sm font-medium text-[var(--color-text)]">
            Nombre completo
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="Camila Rojas"
            className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-email`} className="text-sm font-medium text-[var(--color-text)]">
            Email
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="camila@correo.cl"
            className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-phone`} className="text-sm font-medium text-[var(--color-text)]">
            Teléfono
          </label>
          <input
            id={`${fieldId}-phone`}
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            placeholder="+56 9 1234 5678"
            className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={loading} className="w-full min-h-[48px]">
        {submitLabel}
      </Button>
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        Te enviaremos tu entrada a este correo.
      </p>
    </form>
  );
}
