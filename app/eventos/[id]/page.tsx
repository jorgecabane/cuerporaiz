import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  centerRepository,
  eventRepository,
  eventTicketRepository,
} from "@/lib/adapters/db";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import { EventPurchasePanel } from "./EventPurchasePanel";

export const revalidate = 60;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=1200&q=80";

async function loadPublicEvent(id: string) {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;
  if (!center) return null;
  const event = await eventRepository.findById(id);
  if (!event || event.centerId !== center.id || event.status !== "PUBLISHED") return null;
  return { center, event };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await loadPublicEvent(id);
  if (!data) return buildSiteMetadata({ path: `/eventos/${id}`, type: "website" });
  return buildSiteMetadata({
    path: `/eventos/${id}`,
    type: "website",
    title: data.event.title,
    description: data.event.description ?? undefined,
    image: data.event.imageUrl ?? undefined,
  });
}

function hasEventEnded(startsAt: Date, endsAt: Date | null): boolean {
  return (endsAt ?? startsAt).getTime() < Date.now();
}

function formatDateRange(startsAt: Date, endsAt: Date, tz: string): string {
  const day = startsAt.toLocaleDateString("es-CL", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const start = startsAt.toLocaleTimeString("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const end = endsAt.toLocaleTimeString("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  return `${day} · ${start}–${end} hrs`;
}

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadPublicEvent(id);
  if (!data) notFound();
  const { center, event } = data;

  const [paidCount, tz, session] = await Promise.all([
    eventTicketRepository.countPaidByEventId(id),
    getCenterTimezone(center.id),
    auth(),
  ]);

  const isAuthenticated = !!session?.user?.id && session.user.centerId === center.id;
  let userHasTicket = false;
  let userTicketQty = 0;
  if (isAuthenticated && session?.user?.id) {
    const ticket = await eventTicketRepository.findByEventAndUser(id, session.user.id);
    userHasTicket = ticket?.status === "PAID";
    userTicketQty = ticket?.quantity ?? 0;
  }

  const isFree = event.amountCents === 0;
  const isFull = event.maxCapacity !== null && paidCount >= event.maxCapacity;
  const hasEnded = hasEventEnded(event.startsAt, event.endsAt);
  const availableSeats = event.maxCapacity != null ? event.maxCapacity - paidCount : null;

  return (
    <main className="mx-auto max-w-6xl px-[var(--space-4)] pb-[var(--space-12)] pt-[var(--space-8)] md:px-[var(--space-8)] md:pb-[var(--space-16)] md:pt-[var(--space-10)]">
      <Link
        href="/eventos"
        className="mb-[var(--space-6)] inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
      >
        ← Volver a eventos
      </Link>

      <div className="grid grid-cols-1 gap-[var(--space-10)] md:grid-cols-[1.1fr_0.9fr]">
        {/* Columna izquierda: media + contenido */}
        <div>
          <div className="overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-tertiary)] shadow-[var(--shadow-md)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageUrl ?? FALLBACK_IMAGE}
              alt={event.title}
              className="aspect-[4/5] w-full object-cover md:aspect-[4/5]"
            />
          </div>

          <p className="mt-[var(--space-6)] text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            Evento presencial
          </p>
          <h1 className="mt-[var(--space-2)] font-display text-3xl font-semibold leading-tight text-[var(--color-primary)] md:text-4xl">
            {event.title}
          </h1>

          <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)] text-sm text-[var(--color-text-muted)]">
            <p>🕐 {formatDateRange(event.startsAt, event.endsAt, tz)}</p>
            {event.location && <p>📍 {event.location}</p>}
            {availableSeats != null && !isFull && <p>Quedan {availableSeats} cupos</p>}
          </div>

          {event.description && (
            <div className="mt-[var(--space-6)] whitespace-pre-line text-base leading-relaxed text-[var(--color-text)]">
              {event.description}
            </div>
          )}
        </div>

        {/* Columna derecha: panel de compra sticky */}
        <aside>
          <div className="md:sticky md:top-[calc(var(--header-height)+var(--space-4))]">
            <EventPurchasePanel
              eventId={event.id}
              amountCents={event.amountCents}
              currency={event.currency}
              isFree={isFree}
              availableSeats={availableSeats}
              isAuthenticated={isAuthenticated}
              userHasTicket={userHasTicket}
              userTicketQty={userTicketQty}
              isFull={isFull}
              hasEnded={hasEnded}
              eventTitle={event.title}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
