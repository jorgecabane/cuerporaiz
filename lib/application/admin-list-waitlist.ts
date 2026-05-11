/**
 * Lista admin de la waitlist de una clase o evento, con datos del usuario hidratados.
 * Valida que el item pertenezca al centro del admin antes de devolver.
 */
import {
  waitlistRepository,
  liveClassRepository,
  eventRepository,
  userRepository,
} from "@/lib/adapters/db";
import type { WaitlistEntryWithUserDto } from "@/lib/dto/waitlist-dto";
import type { WaitlistKind } from "@/lib/ports/waitlist-repository";
import { releaseExpiredEventHolds } from "./release-expired-event-holds";

export interface AdminListWaitlistInput {
  centerId: string;
  kind: WaitlistKind;
  itemId: string;
}

export type AdminListWaitlistResult =
  | { success: true; entries: WaitlistEntryWithUserDto[] }
  | { success: false; code: "NOT_FOUND" | "FORBIDDEN"; message: string };

export async function adminListWaitlistUseCase(
  input: AdminListWaitlistInput
): Promise<AdminListWaitlistResult> {
  // Valida ownership del item
  if (input.kind === "class") {
    const lc = await liveClassRepository.findById(input.itemId);
    if (lc === null) return { success: false, code: "NOT_FOUND", message: "Clase no encontrada" };
    if (lc.centerId !== input.centerId) {
      return { success: false, code: "FORBIDDEN", message: "Clase no pertenece a tu centro" };
    }
  } else {
    const ev = await eventRepository.findById(input.itemId);
    if (ev === null) return { success: false, code: "NOT_FOUND", message: "Evento no encontrado" };
    if (ev.centerId !== input.centerId) {
      return { success: false, code: "FORBIDDEN", message: "Evento no pertenece a tu centro" };
    }
    // Lazy: liberar holds expirados antes de mostrar
    await releaseExpiredEventHolds(input.itemId);
  }

  const entries = await waitlistRepository.findActiveByItem(input.kind, input.itemId);
  const result: WaitlistEntryWithUserDto[] = [];
  for (const e of entries) {
    const user = await userRepository.findById(e.userId);
    if (user === null) continue;
    result.push({
      id: e.id,
      userId: e.userId,
      kind: input.kind,
      itemId: input.itemId,
      status: e.status,
      position: e.position,
      notifiedAt: e.notifiedAt?.toISOString() ?? null,
      heldUntil: e.heldUntil?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      user: {
        id: user.id,
        name: user.name ?? null,
        lastName: user.lastName ?? null,
        email: user.email,
      },
    });
  }
  return { success: true, entries: result };
}
