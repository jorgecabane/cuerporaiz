import type { EventAttendee } from "@/lib/domain/event";

export interface EventAttendeeInput {
  name: string | null;
  email: string | null;
}

export interface IEventAttendeeRepository {
  findByToken(token: string): Promise<EventAttendee | null>;
  findByTicketId(ticketId: string): Promise<EventAttendee[]>;
  /** Borra los cupos del ticket y crea uno por elemento (seat = índice + 1). */
  replaceForTicket(ticketId: string, seats: EventAttendeeInput[]): Promise<void>;
  /** Crea los cupos faltantes hasta `quantity` (idempotente). */
  createMissingSeats(ticketId: string, quantity: number): Promise<void>;
  recordEntry(id: string, at: Date): Promise<void>;
  /** Revoca sólo si el cupo pertenece a un evento del centro. Devuelve si revocó. */
  revoke(id: string, centerId: string): Promise<boolean>;
}
