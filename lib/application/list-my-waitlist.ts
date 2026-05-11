/**
 * Lista las entries activas del usuario en el centro actual.
 * Hidrata cada entry con datos del item (clase o evento) para la UI.
 */
import {
  waitlistRepository,
  liveClassRepository,
  eventRepository,
} from "@/lib/adapters/db";
import type { WaitlistEntryDto } from "@/lib/dto/waitlist-dto";

export async function listMyWaitlistUseCase(
  userId: string,
  centerId: string
): Promise<WaitlistEntryDto[]> {
  const entries = await waitlistRepository.findActiveByUserId(userId, centerId);
  const dtos: WaitlistEntryDto[] = [];
  for (const e of entries) {
    if (e.liveClassId !== null) {
      const lc = await liveClassRepository.findById(e.liveClassId);
      if (lc === null || lc.centerId !== centerId) continue;
      // Filtra clases pasadas: ya no tiene sentido seguir esperando
      if (lc.startsAt < new Date()) continue;
      dtos.push({
        id: e.id,
        userId: e.userId,
        kind: "class",
        itemId: e.liveClassId,
        status: e.status,
        position: e.position,
        notifiedAt: e.notifiedAt?.toISOString() ?? null,
        heldUntil: e.heldUntil?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        itemTitle: lc.title,
        itemStartsAt: lc.startsAt.toISOString(),
      });
    } else if (e.eventId !== null) {
      const ev = await eventRepository.findById(e.eventId);
      if (ev === null || ev.centerId !== centerId) continue;
      if (ev.startsAt < new Date()) continue;
      dtos.push({
        id: e.id,
        userId: e.userId,
        kind: "event",
        itemId: e.eventId,
        status: e.status,
        position: e.position,
        notifiedAt: e.notifiedAt?.toISOString() ?? null,
        heldUntil: e.heldUntil?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        itemTitle: ev.title,
        itemStartsAt: ev.startsAt.toISOString(),
      });
    }
  }
  return dtos;
}
