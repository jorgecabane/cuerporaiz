/**
 * Caso de uso: el usuario hace click en "Confirmar mi reserva" desde el correo
 * de waitlist (o desde el panel) y reclama el cupo.
 *
 * Para CLASES:
 * - Re-valida reglas (plan activo, ventana, no-shows, feriado).
 * - Llama al adapter que en una sola transacción con advisory lock crea la
 *   Reservation y marca la entry como PROMOTED.
 * - Si la transacción detecta sobre-cupo, retorna SPOT_TAKEN.
 *
 * Para EVENTOS:
 * - Lazy-libera holds expirados primero.
 * - Llama al adapter que crea EventTicket PENDING + entry HELD por 15 min.
 * - El usuario continúa al checkout (preferencia MercadoPago) desde el caller.
 */
import {
  centerRepository,
  liveClassRepository,
  eventRepository,
  reservationRepository,
  userPlanRepository,
  planRepository,
  centerHolidayRepository,
  waitlistRepository,
} from "@/lib/adapters/db";
import { canPromoteWaitlistEntry, EVENT_HOLD_MINUTES } from "@/lib/domain/waitlist";
import { isUserPlanUsable } from "@/lib/domain/user-plan";

export interface PromoteFromWaitlistInput {
  userId: string;
  entryId: string;
  /** Para clases: si el usuario tiene varios planes, cuál usar. */
  userPlanId?: string;
}

export type PromoteFromWaitlistResult =
  | {
      success: true;
      kind: "class";
      reservationId: string;
    }
  | {
      success: true;
      kind: "event";
      eventTicketId: string;
      heldUntil: Date;
    }
  | { success: false; code: PromoteErrorCode; message: string };

type PromoteErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CANNOT_PROMOTE"
  | "ITEM_NOT_FOUND"
  | "BOOKING_WINDOW_CLOSED"
  | "CLASS_PAST"
  | "HOLIDAY"
  | "NO_SHOW_LIMIT"
  | "NO_ACTIVE_PLAN"
  | "PLAN_NOT_VALID"
  | "SPOT_TAKEN";

export async function promoteFromWaitlistUseCase(
  input: PromoteFromWaitlistInput
): Promise<PromoteFromWaitlistResult> {
  const entry = await waitlistRepository.findById(input.entryId);
  if (entry === null) {
    return { success: false, code: "NOT_FOUND", message: "Entry no encontrada" };
  }
  if (entry.userId !== input.userId) {
    return { success: false, code: "FORBIDDEN", message: "No puedes reclamar esta entry" };
  }
  if (!canPromoteWaitlistEntry(entry.status)) {
    return {
      success: false,
      code: "CANNOT_PROMOTE",
      message: "Esta entry ya no permite confirmar el cupo",
    };
  }

  if (entry.liveClassId !== null) {
    return promoteClass({
      userId: input.userId,
      entryId: input.entryId,
      liveClassId: entry.liveClassId,
      userPlanId: input.userPlanId,
    });
  }
  if (entry.eventId !== null) {
    return promoteEvent({
      userId: input.userId,
      entryId: input.entryId,
      eventId: entry.eventId,
    });
  }
  return { success: false, code: "NOT_FOUND", message: "Entry inválida" };
}

async function promoteClass(params: {
  userId: string;
  entryId: string;
  liveClassId: string;
  userPlanId?: string;
}): Promise<PromoteFromWaitlistResult> {
  const liveClass = await liveClassRepository.findById(params.liveClassId);
  if (liveClass === null) {
    return { success: false, code: "ITEM_NOT_FOUND", message: "Clase no encontrada" };
  }
  if (liveClass.startsAt < new Date()) {
    return { success: false, code: "CLASS_PAST", message: "La clase ya pasó" };
  }

  const center = await centerRepository.findById(liveClass.centerId);
  if (center === null) {
    return { success: false, code: "ITEM_NOT_FOUND", message: "Centro no encontrado" };
  }

  const minutesUntil = (liveClass.startsAt.getTime() - Date.now()) / 60_000;
  if (minutesUntil < center.bookBeforeMinutes) {
    return {
      success: false,
      code: "BOOKING_WINDOW_CLOSED",
      message: "La ventana para reservar esta clase ya cerró",
    };
  }

  // Feriado
  const classDateUtc = new Date(
    Date.UTC(
      liveClass.startsAt.getUTCFullYear(),
      liveClass.startsAt.getUTCMonth(),
      liveClass.startsAt.getUTCDate()
    )
  );
  const holiday = await centerHolidayRepository.findByCenterIdAndDate(
    liveClass.centerId,
    classDateUtc
  );
  if (holiday !== null) {
    return { success: false, code: "HOLIDAY", message: "No se puede reservar en feriado" };
  }

  // Límite no-shows
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const noShows = await reservationRepository.countByUserAndStatus(
    params.userId,
    liveClass.centerId,
    "NO_SHOW",
    startOfMonth
  );
  if (noShows >= center.maxNoShowsPerMonth) {
    return { success: false, code: "NO_SHOW_LIMIT", message: "Alcanzaste el límite de inasistencias" };
  }

  // Plan activo (LIVE)
  const activePlans = await userPlanRepository.findActiveByUserAndCenter(
    params.userId,
    liveClass.centerId
  );
  const livePlans = [];
  for (const up of activePlans) {
    if (!isUserPlanUsable(up)) continue;
    const plan = await planRepository.findById(up.planId);
    if (plan?.type === "LIVE") livePlans.push(up);
  }
  if (livePlans.length === 0) {
    return { success: false, code: "NO_ACTIVE_PLAN", message: "No tienes un plan activo" };
  }
  let selectedPlan = livePlans[0];
  if (params.userPlanId !== undefined) {
    const match = livePlans.find((p) => p.id === params.userPlanId);
    if (match === undefined) {
      return {
        success: false,
        code: "PLAN_NOT_VALID",
        message: "El plan seleccionado no es válido",
      };
    }
    selectedPlan = match;
  }

  const result = await waitlistRepository.promoteToClassReservation({
    entryId: params.entryId,
    userId: params.userId,
    liveClassId: params.liveClassId,
    maxCapacity: liveClass.maxCapacity,
    userPlanId: selectedPlan.id,
    // Solo consumir si el plan tiene cupo limitado (planes ilimitados = null)
    userPlanIdToConsume:
      selectedPlan.classesTotal !== null ? selectedPlan.id : null,
  });
  if (!result.success) {
    return { success: false, code: "SPOT_TAKEN", message: "El cupo ya fue tomado" };
  }

  return { success: true, kind: "class", reservationId: result.reservationId };
}

async function promoteEvent(params: {
  userId: string;
  entryId: string;
  eventId: string;
}): Promise<PromoteFromWaitlistResult> {
  // Lazy expire holds antes
  const now = new Date();
  await waitlistRepository.expireEventHolds(params.eventId, now);

  const event = await eventRepository.findById(params.eventId);
  if (event === null) {
    return { success: false, code: "ITEM_NOT_FOUND", message: "Evento no encontrado" };
  }
  if (event.maxCapacity === null) {
    return { success: false, code: "ITEM_NOT_FOUND", message: "Evento sin cupo configurado" };
  }

  const holdUntil = new Date(Date.now() + EVENT_HOLD_MINUTES * 60_000);
  const result = await waitlistRepository.promoteToEventHold({
    entryId: params.entryId,
    userId: params.userId,
    eventId: params.eventId,
    maxCapacity: event.maxCapacity,
    amountCents: event.amountCents,
    currency: event.currency,
    paymentMethod: "MERCADOPAGO",
    holdUntil,
  });
  if (!result.success) {
    return { success: false, code: "SPOT_TAKEN", message: "El cupo ya fue tomado" };
  }

  return {
    success: true,
    kind: "event",
    eventTicketId: result.ticketId,
    heldUntil: result.heldUntil,
  };
}
