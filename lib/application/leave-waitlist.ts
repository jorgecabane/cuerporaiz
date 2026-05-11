/**
 * Caso de uso: estudiante sale manualmente de la lista de espera.
 * Si la entry está en HELD (evento), también cancela el EventTicket PENDING
 * asociado para liberar el cupo bloqueado.
 */
import { waitlistRepository, eventTicketRepository } from "@/lib/adapters/db";
import { isActiveWaitlistStatus } from "@/lib/domain/waitlist";

export interface LeaveWaitlistInput {
  userId: string;
  entryId: string;
}

export type LeaveWaitlistResult =
  | { success: true }
  | { success: false; code: "NOT_FOUND" | "FORBIDDEN" | "NOT_ACTIVE"; message: string };

export async function leaveWaitlistUseCase(
  input: LeaveWaitlistInput
): Promise<LeaveWaitlistResult> {
  const entry = await waitlistRepository.findById(input.entryId);
  if (entry === null) {
    return { success: false, code: "NOT_FOUND", message: "Entry no encontrada" };
  }
  if (entry.userId !== input.userId) {
    return { success: false, code: "FORBIDDEN", message: "No puedes salir de esta lista" };
  }
  if (!isActiveWaitlistStatus(entry.status)) {
    return {
      success: false,
      code: "NOT_ACTIVE",
      message: "Esta entry ya no está activa",
    };
  }

  // Si tenía hold sobre evento, libera el ticket PENDING también.
  if (entry.status === "HELD" && entry.eventId !== null) {
    const ticket = await eventTicketRepository.findByEventAndUser(
      entry.eventId,
      input.userId
    );
    if (ticket !== null && ticket.status === "PENDING") {
      await eventTicketRepository.updateStatus(ticket.id, "CANCELLED");
    }
  }

  await waitlistRepository.updateStatus(input.entryId, "CANCELLED");
  return { success: true };
}
