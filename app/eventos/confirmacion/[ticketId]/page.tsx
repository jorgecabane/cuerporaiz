import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, Clock } from "lucide-react";
import {
  eventRepository,
  eventTicketRepository,
  userRepository,
} from "@/lib/adapters/db";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import { ClaimAccountForm } from "./ClaimAccountForm";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date, tz: string): string {
  return date.toLocaleDateString("es-CL", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { ticketId } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const ticket = await eventTicketRepository.findByClaimToken(token);
  if (!ticket || ticket.id !== ticketId) notFound();

  const [event, user] = await Promise.all([
    eventRepository.findById(ticket.eventId),
    userRepository.findById(ticket.userId),
  ]);
  if (!event) notFound();

  const [tz, auth] = await Promise.all([
    getCenterTimezone(event.centerId),
    userRepository.findAuthSummaryById(ticket.userId),
  ]);

  const isPaid = ticket.status === "PAID";
  const showClaim = !!auth && !auth.hasPassword && !auth.emailVerified;

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-[var(--space-4)] py-[var(--space-16)] text-center">
      {isPaid ? (
        <CheckCircle className="size-14 text-[var(--color-success)]" aria-hidden />
      ) : (
        <Clock className="size-14 text-[var(--color-text-muted)]" aria-hidden />
      )}

      <h1 className="mt-[var(--space-5)] font-display text-3xl font-semibold text-[var(--color-primary)]">
        {isPaid ? "¡Listo, tu entrada está confirmada!" : "Estamos procesando tu pago"}
      </h1>
      {user?.email && (
        <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">
          Enviamos los detalles a{" "}
          <span className="font-medium text-[var(--color-text)]">{user.email}</span>
        </p>
      )}

      <section className="mt-[var(--space-8)] w-full rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] text-left">
        <h2 className="font-display text-xl font-semibold text-[var(--color-primary)]">
          {event.title}
        </h2>
        <p className="mt-[var(--space-2)] text-sm text-[var(--color-text-muted)]">
          🕐 {formatDateTime(event.startsAt, tz)}
        </p>
        {event.location && (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">📍 {event.location}</p>
        )}
        <hr className="my-[var(--space-4)] border-[var(--color-border)]" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">
            {ticket.quantity} {ticket.quantity === 1 ? "entrada" : "entradas"}
          </span>
          <span className="font-display font-semibold text-[var(--color-primary)]">
            {ticket.amountCents === 0
              ? "Gratis"
              : `$${ticket.amountCents.toLocaleString("es-CL")}`}
          </span>
        </div>
      </section>

      {showClaim && (
        <div className="mt-[var(--space-5)] w-full">
          <ClaimAccountForm ticketId={ticket.id} token={token} email={user?.email ?? ""} />
        </div>
      )}

      <Link
        href="/eventos"
        className="mt-[var(--space-6)] text-sm font-medium text-[var(--color-primary)] underline underline-offset-4 transition-colors hover:text-[var(--color-secondary)]"
      >
        Ver más eventos
      </Link>
    </main>
  );
}
