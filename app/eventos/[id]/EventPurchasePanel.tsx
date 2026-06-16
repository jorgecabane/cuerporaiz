"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { useIsMobile, usePrefersReducedMotion } from "@/components/ui/useMediaQuery";
import { ComprarEventoButton } from "@/app/panel/eventos/[id]/ComprarEventoButton";
import { GuestCheckoutForm } from "./GuestCheckoutForm";

type Props = {
  eventId: string;
  amountCents: number;
  currency: string;
  isFree: boolean;
  availableSeats: number | null;
  isAuthenticated: boolean;
  userHasTicket: boolean;
  userTicketQty: number;
  isFull: boolean;
  hasEnded: boolean;
  eventTitle: string;
};

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function EventPurchasePanel(props: Props) {
  const {
    eventId,
    amountCents,
    currency,
    isFree,
    availableSeats,
    isAuthenticated,
    userHasTicket,
    userTicketQty,
    isFull,
    hasEnded,
    eventTitle,
  } = props;

  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);

  const maxQuantity = availableSeats == null ? 200 : Math.max(1, availableSeats);
  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(`/eventos/${eventId}`)}`;

  const priceBlock = (
    <div className="flex items-baseline justify-between gap-[var(--space-3)]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
          Entrada
        </p>
        <p className="font-display text-2xl font-semibold leading-none text-[var(--color-primary)]">
          {isFree ? "Gratis" : formatPrice(amountCents, currency)}
        </p>
      </div>
      {!isFree && <span className="text-sm text-[var(--color-text-muted)]">por persona</span>}
    </div>
  );

  // ── Estados terminales ──────────────────────────────────────────────
  if (hasEnded) {
    return (
      <Panel>
        {priceBlock}
        <p className="mt-[var(--space-4)] rounded-[var(--radius-md)] bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-3)] text-center text-sm font-medium text-[var(--color-text-muted)]">
          Este evento ya finalizó
        </p>
      </Panel>
    );
  }

  if (userHasTicket) {
    return (
      <Panel>
        {priceBlock}
        <p className="mt-[var(--space-4)] inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-green-100 px-[var(--space-4)] py-[var(--space-3)] text-sm font-medium text-green-800">
          <span aria-hidden="true">✓</span>
          {userTicketQty > 1 ? `Tienes ${userTicketQty} entradas` : "Ya tienes tu entrada"}
        </p>
      </Panel>
    );
  }

  if (isFull) {
    return (
      <Panel>
        {priceBlock}
        <p className="mt-[var(--space-4)] rounded-[var(--radius-md)] bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-3)] text-center text-sm font-medium text-[var(--color-text-muted)]">
          Entradas agotadas
        </p>
      </Panel>
    );
  }

  // ── Usuario autenticado: flujo de siempre ───────────────────────────
  if (isAuthenticated) {
    return (
      <Panel>
        {priceBlock}
        <div className="mt-[var(--space-4)]">
          <ComprarEventoButton
            eventId={eventId}
            amountCents={amountCents}
            currency={currency}
            isFree={isFree}
            availableSeats={availableSeats}
          />
        </div>
      </Panel>
    );
  }

  // ── Guest: drawer en mobile, inline en desktop ──────────────────────
  const form = (
    <GuestCheckoutForm
      eventId={eventId}
      amountCents={amountCents}
      currency={currency}
      isFree={isFree}
      maxQuantity={maxQuantity}
      loginHref={loginHref}
    />
  );

  return (
    <Panel>
      {priceBlock}
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-[var(--space-4)] w-full min-h-[48px]"
      >
        {isFree ? "Reservar entrada" : "Comprar entrada"}
      </Button>
      <p className="mt-[var(--space-3)] text-center text-sm text-[var(--color-text-muted)]">
        ¿Ya tienes cuenta?{" "}
        <a href={loginHref} className="font-medium text-[var(--color-primary)] underline underline-offset-2">
          Inicia sesión
        </a>
      </p>

      {/* Desktop: inline expand */}
      {!isMobile && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { height: "auto", opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <hr className="my-[var(--space-4)] border-[var(--color-border)]" />
              {form}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile: drawer */}
      {isMobile && (
        <AdaptiveSheet
          open={open}
          onOpenChange={setOpen}
          variant="sheet"
          title={eventTitle}
          maxHeight={{ mobile: "90vh" }}
        >
          <div className="p-[var(--space-4)]">{form}</div>
        </AdaptiveSheet>
      )}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)]">
      {children}
    </div>
  );
}
