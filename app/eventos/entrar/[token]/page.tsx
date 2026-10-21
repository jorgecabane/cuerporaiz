import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  eventAttendeeRepository,
  eventRepository,
  eventTicketRepository,
  siteConfigRepository,
} from "@/lib/adapters/db";
import { resolveEventEntry } from "@/lib/domain/event-entry";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import { WaitingRoom } from "./WaitingRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const MESSAGES = {
  invalid: "Este link no es válido.",
  cancelled: "Este evento fue cancelado.",
  ended: "Este evento ya terminó.",
} as const;

async function load(token: string) {
  const attendee = await eventAttendeeRepository.findByToken(token);
  if (!attendee) return { attendee: null, ticket: null, event: null };
  const ticket = await eventTicketRepository.findById(attendee.ticketId);
  const event = ticket ? await eventRepository.findById(ticket.eventId) : null;
  return { attendee, ticket, event };
}

/** Link personal de un cupo de evento online: sala de espera o redirección a la reunión. */
export default async function EventEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { attendee, ticket, event } = await load(token);
  const decision = resolveEventEntry({ attendee, ticketStatus: ticket?.status ?? null, event, now: new Date() });

  if (decision.kind === "enter") {
    // ponytail: un escáner de correo o el preview de WhatsApp dentro de la ventana marca "Entró"; aceptable para el panel.
    await eventAttendeeRepository.recordEntry(attendee!.id, new Date());
    redirect(decision.meetingUrl);
  }

  if (decision.kind === "waiting") {
    const timeZone = await getCenterTimezone(event!.centerId);
    return (
      <WaitingRoom
        eventTitle={event!.title}
        attendeeName={attendee!.name}
        startsAtIso={event!.startsAt.toISOString()}
        opensAtIso={decision.opensAt.toISOString()}
        timeZone={timeZone}
      />
    );
  }

  const whatsappUrl = event ? (await siteConfigRepository.findByCenterId(event.centerId))?.whatsappUrl : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-[var(--space-4)] py-[var(--space-16)] text-center">
      <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">{MESSAGES[decision.kind]}</h1>
      {decision.kind === "invalid" && (
        <p className="mt-[var(--space-3)] text-[var(--color-text-muted)]">
          Revisa que sea el link que te llegó por correo.
        </p>
      )}
      {whatsappUrl && decision.kind !== "ended" && (
        <a
          href={whatsappUrl}
          className="mt-[var(--space-6)] font-medium text-[var(--color-primary)] underline underline-offset-4"
        >
          Escribir por WhatsApp
        </a>
      )}
    </main>
  );
}
