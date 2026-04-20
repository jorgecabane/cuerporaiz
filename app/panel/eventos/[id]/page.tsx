import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import Link from "next/link";
import { eventRepository, eventTicketRepository, prisma } from "@/lib/adapters/db";
import { EVENT_STATUS_LABELS } from "@/lib/domain/event";
import { InlineEditToggle } from "@/components/panel/on-demand/InlineEditToggle";
import { EventForm } from "@/app/panel/eventos/nuevo/EventForm";
import { ManualTicketForm } from "./ManualTicketForm";
import { ComprarEventoButton } from "./ComprarEventoButton";

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function hasEventEnded(startsAt: Date, endsAt: Date | null): boolean {
  const endRef = endsAt ?? startsAt;
  return endRef.getTime() < Date.now();
}

function EventStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-800",
    DRAFT: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {EVENT_STATUS_LABELS[status as keyof typeof EVENT_STATUS_LABELS] ?? status}
    </span>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/auth/login?callbackUrl=/panel/eventos");

  const { id } = await params;
  const isAdmin = isAdminRole(session.user.role);
  const userId = session.user.id;
  const centerId = session.user.centerId;

  const event = await eventRepository.findById(id);
  if (!event || event.centerId !== centerId) redirect("/panel/eventos");

  // Gate: students only see PUBLISHED events
  if (!isAdmin && event.status !== "PUBLISHED") redirect("/panel/eventos");

  const [paidCount, userTicket] = await Promise.all([
    eventTicketRepository.countPaidByEventId(id),
    eventTicketRepository.findByEventAndUser(id, userId),
  ]);

  const isFree = event.amountCents === 0;
  const isFull = event.maxCapacity !== null && paidCount >= event.maxCapacity;
  const userHasTicket = userTicket?.status === "PAID";
  const hasEnded = hasEventEnded(event.startsAt, event.endsAt);

  /* ── Admin: fetch attendees with user info ── */
  type Attendee = { id: string; name: string | null; email: string; paidAt: Date | null };
  let attendees: Attendee[] = [];
  if (isAdmin) {
    const tickets = await prisma.eventTicket.findMany({
      where: { eventId: id, status: "PAID" },
      select: { id: true, paidAt: true, user: { select: { name: true, email: true } } },
      orderBy: { paidAt: "asc" },
    });
    attendees = tickets.map((t) => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      paidAt: t.paidAt,
    }));
  }

  /* ── Admin view ── */
  if (isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6">
          <Link
            href="/panel/eventos"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← Volver a Eventos
          </Link>
        </div>

        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)] mb-6">
          {event.title}
        </h1>

        {/* Inline edit */}
        <div className="mb-8">
          <InlineEditToggle
            editLabel="Editar"
            viewContent={
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--color-text)]">{event.title}</span>
                  <EventStatusBadge status={event.status} />
                  {isFree && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      Gratis
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-sm text-[var(--color-text-muted)]">{event.description}</p>
                )}
                <div className="space-y-0.5 text-sm text-[var(--color-text-muted)]">
                  <p>Inicio: {formatDate(event.startsAt)}</p>
                  <p>Fin: {formatDate(event.endsAt)}</p>
                  {event.location && <p>Lugar: {event.location}</p>}
                  {!isFree && <p>Precio: {formatPrice(event.amountCents, event.currency)}</p>}
                  <p>
                    Cupos:{" "}
                    {event.maxCapacity != null
                      ? `${paidCount} de ${event.maxCapacity} vendidos`
                      : `${paidCount} inscritos (sin límite)`}
                  </p>
                </div>
              </div>
            }
            editContent={<EventForm mode="edit" event={event} />}
          />
        </div>

        {/* Asistentes */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            Asistentes
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({paidCount}{event.maxCapacity != null ? ` / ${event.maxCapacity}` : ""})
            </span>
          </h2>

          {attendees.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Aún no hay asistentes registrados.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {attendees.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {a.name ?? a.email}
                    </p>
                    {a.name && (
                      <p className="text-xs text-[var(--color-text-muted)]">{a.email}</p>
                    )}
                  </div>
                  {a.paidAt && (
                    <p className="text-xs text-[var(--color-text-muted)] shrink-0">
                      {a.paidAt.toLocaleDateString("es-CL")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Registro manual */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            Registrar pago manual
          </h2>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <ManualTicketForm eventId={id} />
          </div>
        </section>
      </div>
    );
  }

  /* ── Student view ── */
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/panel/eventos"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ← Volver a Eventos
        </Link>
      </div>

      {/* Hero image */}
      {event.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-[var(--radius-lg)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-48 sm:h-64 object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
            {event.title}
          </h1>
          {isFree && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              Gratis
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-[var(--color-text-muted)] leading-relaxed">{event.description}</p>
        )}
      </div>

      {/* Details card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-6 space-y-3">
        <div className="flex gap-3">
          <span className="text-[var(--color-text-muted)] text-sm w-16 shrink-0">Inicio</span>
          <span className="text-sm text-[var(--color-text)]">{formatDate(event.startsAt)}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[var(--color-text-muted)] text-sm w-16 shrink-0">Fin</span>
          <span className="text-sm text-[var(--color-text)]">{formatDate(event.endsAt)}</span>
        </div>
        {event.location && (
          <div className="flex gap-3">
            <span className="text-[var(--color-text-muted)] text-sm w-16 shrink-0">Lugar</span>
            <span className="text-sm text-[var(--color-text)]">{event.location}</span>
          </div>
        )}
        {!isFree && (
          <div className="flex gap-3">
            <span className="text-[var(--color-text-muted)] text-sm w-16 shrink-0">Precio</span>
            <span className="text-sm font-semibold text-[var(--color-primary)]">
              {formatPrice(event.amountCents, event.currency)}
            </span>
          </div>
        )}
        {event.maxCapacity != null && (
          <div className="flex gap-3">
            <span className="text-[var(--color-text-muted)] text-sm w-16 shrink-0">Cupos</span>
            <span className="text-sm text-[var(--color-text)]">
              {event.maxCapacity - paidCount} disponibles de {event.maxCapacity}
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-4">
        {userHasTicket ? (
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-green-100 px-4 py-2.5 text-sm font-medium text-green-800">
            <span>✓</span>
            Ya tienes tu entrada
          </div>
        ) : hasEnded ? (
          <div className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)]">
            Este evento ya finalizó
          </div>
        ) : isFull ? (
          <div className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)]">
            Evento agotado
          </div>
        ) : (
          <ComprarEventoButton
            eventId={id}
            amountCents={event.amountCents}
            currency={event.currency}
            isFree={isFree}
          />
        )}
      </div>
    </div>
  );
}
