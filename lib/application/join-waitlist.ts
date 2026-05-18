/**
 * Caso de uso: estudiante se une a la lista de espera de una clase o evento.
 *
 * Valida:
 * - Item existe y pertenece al centro.
 * - Centro tiene la feature habilitada (Center.notifyWhenSlotFreed).
 * - El item está LLENO (si hay cupo, debe reservar/comprar directamente).
 * - El usuario no está ya en la waitlist (cualquier estado).
 *
 * No re-valida reglas de plan/no-shows aquí; eso se hace en el momento de
 * promote-from-waitlist (cuando intenta confirmar el cupo). Permitir entrar a
 * waitlist con plan próximo a vencer es OK: si vence, el promote falla y la
 * entry queda CANCELLED.
 */
import type { JoinWaitlistResult } from "@/lib/dto/waitlist-dto";
import type { WaitlistKind } from "@/lib/ports/waitlist-repository";
import {
  centerRepository,
  liveClassRepository,
  eventRepository,
  eventTicketRepository,
  waitlistRepository,
} from "@/lib/adapters/db";
import type { WaitlistEntry } from "@/lib/domain/waitlist-entry";

export interface JoinWaitlistInput {
  userId: string;
  centerId: string;
  kind: WaitlistKind;
  itemId: string;
}

export async function joinWaitlistUseCase(
  input: JoinWaitlistInput
): Promise<JoinWaitlistResult> {
  // Centro habilitado
  const center = await centerRepository.findById(input.centerId);
  if (!center) {
    return { success: false, code: "CENTER_NOT_FOUND", message: "Centro no encontrado" };
  }
  if (!center.notifyWhenSlotFreed) {
    return {
      success: false,
      code: "WAITLIST_DISABLED",
      message: "Este centro no tiene listas de espera habilitadas",
    };
  }

  // Validar item + cupo según kind
  if (input.kind === "class") {
    const liveClass = await liveClassRepository.findById(input.itemId);
    if (!liveClass) {
      return { success: false, code: "ITEM_NOT_FOUND", message: "Clase no encontrada" };
    }
    if (liveClass.centerId !== input.centerId) {
      return { success: false, code: "FORBIDDEN", message: "La clase no pertenece a tu centro" };
    }
    const confirmed = await liveClassRepository.countConfirmedReservations(input.itemId);
    if (confirmed < liveClass.maxCapacity) {
      return {
        success: false,
        code: "HAS_SPOTS",
        message: "Hay cupos disponibles, reserva directamente",
      };
    }
  } else {
    const event = await eventRepository.findById(input.itemId);
    if (!event) {
      return { success: false, code: "ITEM_NOT_FOUND", message: "Evento no encontrado" };
    }
    if (event.centerId !== input.centerId) {
      return { success: false, code: "FORBIDDEN", message: "El evento no pertenece a tu centro" };
    }
    if (event.maxCapacity === null) {
      // Sin cap definido: no aplica waitlist
      return {
        success: false,
        code: "HAS_SPOTS",
        message: "Este evento no tiene cupo limitado",
      };
    }
    const paid = await eventTicketRepository.countPaidByEventId(input.itemId);
    const now = new Date();
    const held = await waitlistRepository.countActiveHoldsByEventId(input.itemId, now);
    if (paid + held < event.maxCapacity) {
      return {
        success: false,
        code: "HAS_SPOTS",
        message: "Hay cupos disponibles, compra directamente",
      };
    }
  }

  // No duplicar: la unique constraint del schema lo prohíbe (incluso para
  // entries terminales). Devolvemos código claro si ya existe.
  const existing = await waitlistRepository.findByUserAndItem(
    input.userId,
    input.kind,
    input.itemId
  );
  if (existing !== null) {
    return {
      success: false,
      code: "ALREADY_IN_WAITLIST",
      message: "Ya estás en la lista de espera",
    };
  }

  const entry = await waitlistRepository.create({
    userId: input.userId,
    centerId: input.centerId,
    kind: input.kind,
    itemId: input.itemId,
  });

  return {
    success: true,
    entry: toEntryDto(entry, input.kind, input.itemId),
  };
}

function toEntryDto(
  e: WaitlistEntry,
  kind: WaitlistKind,
  itemId: string
) {
  return {
    id: e.id,
    userId: e.userId,
    kind,
    itemId,
    status: e.status,
    position: e.position,
    notifiedAt: e.notifiedAt?.toISOString() ?? null,
    heldUntil: e.heldUntil?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}
