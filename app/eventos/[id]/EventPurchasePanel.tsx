"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { useIsMobile, usePrefersReducedMotion } from "@/components/ui/useMediaQuery";
import { ComprarEventoButton } from "@/app/panel/eventos/[id]/ComprarEventoButton";
import { GuestCheckoutForm } from "./GuestCheckoutForm";
import { formatMoney } from "@/lib/domain/money";

type Props = {
  eventId: string;
  amountCents: number;
  currency: string;
  isFree: boolean;
  availableSeats: number | null;
  isFull: boolean;
  hasEnded: boolean;
  eventTitle: string;
};

export function EventPurchasePanel(props: Props) {
  const {
    eventId,
    amountCents,
    currency,
    isFree,
    availableSeats,
    isFull,
    hasEnded,
    eventTitle,
  } = props;

  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const { viewer, reload } = useEventViewer(eventId);
  const isAuthenticated = viewer?.authenticated ?? false;
  const userHasTicket = viewer?.hasTicket ?? false;
  const userTicketQty = viewer?.quantity ?? 0;

  const maxQuantity = availableSeats == null ? 200 : Math.max(1, availableSeats);
  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(`/eventos/${eventId}`)}`;

  const priceBlock = (
    <div className="flex items-baseline justify-between gap-[var(--space-3)]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
          Entrada
        </p>
        <p className="font-display text-2xl font-semibold leading-none text-[var(--color-primary)]">
          {isFree ? "Gratis" : formatMoney(amountCents, currency)}
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

  // Mientras se sabe si hay sesión/entrada: placeholder del botón (sin parpadeo).
  if (viewer === null) {
    return (
      <Panel>
        {priceBlock}
        <div
          aria-busy="true"
          aria-label="Cargando"
          className="mt-[var(--space-4)] h-12 w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--color-tertiary)]"
        />
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
            onPurchased={reload}
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

type Viewer = { authenticated: boolean; hasTicket: boolean; quantity: number };

/** Sesión y entrada del visitante (la página es ISR: esto no puede venir del servidor). */
function useEventViewer(eventId: string): { viewer: Viewer | null; reload: () => void } {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const reload = useCallback(() => {
    fetch(`/api/events/${eventId}/my-ticket`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Viewer | null) => setViewer(data ?? { authenticated: false, hasTicket: false, quantity: 0 }))
      .catch(() => setViewer({ authenticated: false, hasTicket: false, quantity: 0 }));
  }, [eventId]);
  useEffect(reload, [reload]);
  return { viewer, reload };
}
