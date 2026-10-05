import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eventRepository, eventTicketRepository } from "@/lib/adapters/db";

/**
 * GET /api/events/[id]/my-ticket
 *
 * Estado del visitante frente a un evento (sesión + entrada). Lo consulta el
 * panel de compra desde el cliente para que /eventos/[id] pueda quedar en
 * caché (ISR) sin llamar a auth() en el servidor.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const event = await eventRepository.findById(id);
  const authenticated = Boolean(session?.user?.id && event && session.user.centerId === event.centerId);
  if (!authenticated || !session?.user?.id) {
    return NextResponse.json({ authenticated: false, hasTicket: false, quantity: 0 });
  }
  const ticket = await eventTicketRepository.findByEventAndUser(id, session.user.id);
  return NextResponse.json({
    authenticated: true,
    hasTicket: ticket?.status === "PAID",
    quantity: ticket?.status === "PAID" ? ticket.quantity : 0,
  });
}
