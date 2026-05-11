/**
 * Tipo de dominio puro para una entrada de waitlist.
 * Polimórfico (clase O evento) — invariante validado en lib/domain/waitlist.ts.
 */
import type { WaitlistStatus } from "./waitlist";

export interface WaitlistEntry {
  id: string;
  userId: string;
  centerId: string;
  liveClassId: string | null;
  eventId: string | null;
  status: WaitlistStatus;
  position: number;
  notifiedAt: Date | null;
  heldUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
