import { eventAttendeeRepository, eventTicketRepository } from "@/lib/adapters/db";
import type { EventAttendee } from "@/lib/domain/event";

/**
 * Asegura un cupo (con link personal) por cada entrada de un ticket de evento
 * online. Idempotente: se llama en cada confirmación y al mostrar la confirmación.
 */
export async function ensureEventAttendees(
  ticket: { id: string; quantity: number },
  event: { isOnline: boolean }
): Promise<EventAttendee[]> {
  if (!event.isOnline) return [];
  await eventAttendeeRepository.createMissingSeats(ticket.id, ticket.quantity);
  return eventAttendeeRepository.findByTicketId(ticket.id);
}

/**
 * Cupos para todas las entradas pagadas de un evento. Cubre compras hechas
 * antes de marcarlo online (o cuyo cupo falló al confirmar).
 */
export async function ensureSeatsForEvent(eventId: string): Promise<void> {
  const tickets = await eventTicketRepository.findByEventId(eventId);
  for (const t of tickets) {
    if (t.status === "PAID") await eventAttendeeRepository.createMissingSeats(t.id, t.quantity);
  }
}
