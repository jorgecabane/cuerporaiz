import { eventAttendeeRepository } from "@/lib/adapters/db";
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
