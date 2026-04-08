import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eventRepository, eventTicketRepository } from "@/lib/adapters/db";

/**
 * GET /api/events?from=ISO&to=ISO
 * Returns published events for the user's center within the date range.
 * Includes ticket count and whether the current user has a PAID ticket.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.centerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const [events, userTickets] = await Promise.all([
    eventRepository.findByDateRange(
      session.user.centerId,
      new Date(from),
      new Date(to)
    ),
    eventTicketRepository.findByUserId(session.user.id),
  ]);

  const published = events.filter((e) => e.status === "PUBLISHED");
  const paidTicketEventIds = new Set(
    userTickets.filter((t) => t.status === "PAID").map((t) => t.eventId)
  );

  const result = published.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    color: e.color,
    status: e.status,
    amountCents: e.amountCents,
    currency: e.currency,
    maxCapacity: e.maxCapacity,
    hasTicket: paidTicketEventIds.has(e.id),
  }));

  return NextResponse.json(result);
}
