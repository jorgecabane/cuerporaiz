import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import Link from "next/link";
import { eventRepository, eventTicketRepository } from "@/lib/adapters/db";
import { EVENT_STATUS_LABELS } from "@/lib/domain/event";
import type { Event } from "@/lib/domain/event";

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Gratis";
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function hasEventEnded(event: Pick<Event, "startsAt" | "endsAt">): boolean {
  const endRef = event.endsAt ?? event.startsAt;
  return endRef.getTime() < Date.now();
}

function EventStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-800",
    DRAFT: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {EVENT_STATUS_LABELS[status as keyof typeof EVENT_STATUS_LABELS] ?? status}
    </span>
  );
}

/* ── Admin list card ── */
async function AdminEventCard({ event, hasEnded }: { event: Event; hasEnded: boolean }) {
  const paidCount = await eventTicketRepository.countPaidByEventId(event.id);

  return (
    <li>
      <Link
        href={`/panel/eventos/${event.id}`}
        className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className={`font-semibold ${hasEnded ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>{event.title}</p>
            <EventStatusBadge status={event.status} />
            {hasEnded && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                Finalizado
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatDateShort(event.startsAt)}
            {" → "}
            {formatDateShort(event.endsAt)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {formatPrice(event.amountCents, event.currency)}
            {" · "}
            {event.maxCapacity != null
              ? `${paidCount} / ${event.maxCapacity} cupos`
              : `${paidCount} inscritos`}
          </p>
        </div>
      </Link>
    </li>
  );
}

/* ── Student event card ── */
function StudentEventCard({ event }: { event: Event }) {
  return (
    <li>
      <Link
        href={`/panel/eventos/${event.id}`}
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-primary)] transition-colors"
      >
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-36 object-cover rounded-[var(--radius-md)]"
          />
        )}
        <div>
          <p className="font-semibold text-[var(--color-text)] mb-1">{event.title}</p>
          {event.description && (
            <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2">
              {event.description}
            </p>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatDateShort(event.startsAt)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-sm font-semibold text-[var(--color-primary)]">
            {formatPrice(event.amountCents, event.currency)}
          </span>
          <span className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white">
            {event.amountCents === 0 ? "Reservar" : "Comprar entrada"}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function EventosPage() {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/auth/login?callbackUrl=/panel/eventos");

  const centerId = session.user.centerId;
  const isAdmin = isAdminRole(session.user.role);

  const allEvents = await eventRepository.findByCenterId(centerId);

  // Students only see PUBLISHED events that have not finished yet.
  const events = isAdmin
    ? allEvents
    : allEvents.filter((e) => e.status === "PUBLISHED" && !hasEventEnded(e));

  /* ── Admin layout ── */
  if (isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
            Eventos
          </h1>
          <Link
            href="/panel/eventos/nuevo"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Nuevo evento
          </Link>
        </div>
        <p className="text-[var(--color-text-muted)] mb-6">
          Gestiona los eventos del centro.
        </p>

        {events.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-[var(--color-text-muted)]">
              No hay eventos. Crea uno desde &quot;Nuevo evento&quot;.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <AdminEventCard key={event.id} event={event} hasEnded={hasEventEnded(event)} />
            ))}
          </ul>
        )}

        <div className="mt-8">
          <Link
            href="/panel"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ← Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  /* ── Student layout ── */
  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--space-4)] py-[var(--space-8)] md:py-[var(--space-12)]">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Eventos
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Descubre y reserva nuestros próximos eventos.
      </p>

      {events.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)]">
            No hay eventos disponibles por el momento.
          </p>
          <div className="mt-4">
            <Link
              href="/panel"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ← Volver al panel
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <StudentEventCard key={event.id} event={event} />
            ))}
          </ul>
          <div className="mt-8">
            <Link
              href="/panel"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ← Volver al panel
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
