/**
 * Libera holds expirados de un evento (lazy expiration, reemplaza al cron).
 * Marca WaitlistEntry HELD vencidos como EXPIRED y cancela los EventTicket
 * PENDING asociados.
 *
 * Se invoca al inicio de notify-waitlist-on-spot-freed (eventos), join-waitlist
 * (eventos), promote-from-waitlist (eventos) y al cargar la lista admin.
 */
import { waitlistRepository } from "@/lib/adapters/db";

export async function releaseExpiredEventHolds(
  eventId: string,
  now: Date = new Date()
): Promise<string[]> {
  return waitlistRepository.expireEventHolds(eventId, now);
}
