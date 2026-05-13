/**
 * Caso de uso: checkout de eventos (entrada libre o con pago MercadoPago).
 *
 * Soporta:
 * - Compra inicial con N cupos.
 * - Re-compra ("Agregar más cupos") cuando el usuario ya tiene un ticket PAID:
 *   - Free → incrementa quantity directo + email kind=addition.
 *   - Pagado → crea preferencia MP por el delta y deja
 *     `pendingAdditionQuantity` seteado; el webhook lo confirma.
 * - Reuso de tickets PENDING/CANCELLED del mismo usuario para evitar P2002.
 */
import * as crypto from "node:crypto";
import {
  eventRepository,
  eventTicketRepository,
  mercadopagoConfigRepository,
  centerRepository,
} from "@/lib/adapters/db";
import { mercadoPagoPaymentAdapter } from "@/lib/adapters/payment";
import type { EventTicket } from "@/lib/domain/event";

export type EventCheckoutErrorCode =
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_PUBLISHED"
  | "EVENT_ENDED"
  | "ALREADY_PURCHASED"
  | "EVENT_FULL"
  | "INVALID_QUANTITY"
  | "INVALID_MODE"
  | "MP_NOT_CONFIGURED"
  | "MP_PREFERENCE_FAILED";

export type EventCheckoutMode = "purchase" | "addition";

export type EventCheckoutResult =
  | { success: true; ticket: EventTicket; checkoutUrl?: string; redirectTo?: string }
  | { success: false; code: EventCheckoutErrorCode; message: string };

export interface CreateEventCheckoutInput {
  eventId: string;
  centerId: string;
  userId: string;
  baseUrl: string;
  /** Cupos: compra inicial = total. Re-compra = delta a sumar. */
  quantity?: number;
  /** "purchase" (default) o "addition" para re-compra. */
  mode?: EventCheckoutMode;
  payerEmail?: string;
  payerFirstName?: string;
  payerLastName?: string;
}

/**
 * Reusa un ticket PENDING/CANCELLED existente o crea uno nuevo. Mantiene la
 * unicidad `(eventId, userId)` evitando P2002 cuando el alumno reintenta.
 */
async function upsertTicket(input: {
  existing: EventTicket | null;
  eventId: string;
  userId: string;
  amountCents: number;
  currency: string;
  quantity: number;
}): Promise<EventTicket> {
  if (input.existing) {
    const reset = await eventTicketRepository.resetPending(input.existing.id, {
      amountCents: input.amountCents,
      quantity: input.quantity,
      currency: input.currency,
    });
    if (reset) return reset;
  }
  return eventTicketRepository.create({
    eventId: input.eventId,
    userId: input.userId,
    amountCents: input.amountCents,
    currency: input.currency,
    quantity: input.quantity,
  });
}

function buildBackUrls(base: string, centerId: string, ticketId: string) {
  const safe = base.replace(/\/$/, "");
  return {
    success: `${safe}/api/events/checkout/success?centerId=${centerId}&ticketId=${ticketId}`,
    failure: `${safe}/api/events/checkout/failure?centerId=${centerId}&ticketId=${ticketId}`,
    pending: `${safe}/api/events/checkout/pending?centerId=${centerId}&ticketId=${ticketId}`,
  };
}

/**
 * Crea un ticket de evento o procesa una re-compra (modo "addition").
 */
export async function createEventCheckout(
  input: CreateEventCheckoutInput
): Promise<EventCheckoutResult> {
  const quantity = input.quantity ?? 1;
  const mode: EventCheckoutMode = input.mode ?? "purchase";
  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      success: false,
      code: "INVALID_QUANTITY",
      message: "La cantidad de cupos debe ser un entero mayor o igual a 1",
    };
  }

  const event = await eventRepository.findById(input.eventId);
  if (!event || event.centerId !== input.centerId) {
    return { success: false, code: "EVENT_NOT_FOUND", message: "Evento no encontrado" };
  }

  if (event.status !== "PUBLISHED") {
    return { success: false, code: "EVENT_NOT_PUBLISHED", message: "El evento no está disponible" };
  }

  const endReference = event.endsAt ?? event.startsAt;
  if (endReference.getTime() < Date.now()) {
    return { success: false, code: "EVENT_ENDED", message: "Este evento ya finalizó" };
  }

  const existing = await eventTicketRepository.findByEventAndUser(event.id, input.userId);

  // ─── Modo "addition" (re-compra) ───────────────────────────────────────
  if (mode === "addition") {
    return processAddition({ input, event, existing, delta: quantity });
  }

  // ─── Modo "purchase" (compra inicial) ──────────────────────────────────

  if (existing && (existing.status === "PAID" || existing.status === "REFUNDED")) {
    return { success: false, code: "ALREADY_PURCHASED", message: "Ya tienes una entrada para este evento" };
  }

  if (event.maxCapacity !== null) {
    const paidSeats = await eventTicketRepository.countPaidByEventId(event.id);
    const available = event.maxCapacity - paidSeats;
    if (available < quantity) {
      return {
        success: false,
        code: "EVENT_FULL",
        message:
          available <= 0
            ? "El evento está lleno"
            : `Sólo quedan ${available} cupos disponibles`,
      };
    }
  }

  const totalAmountCents = event.amountCents * quantity;

  // Evento gratuito: crear ticket PAID directamente. Nunca toca MP.
  if (event.amountCents === 0) {
    const pending = await upsertTicket({
      existing,
      eventId: event.id,
      userId: input.userId,
      amountCents: 0,
      currency: event.currency,
      quantity,
    });
    const paid = await eventTicketRepository.updateStatus(pending.id, "PAID", { paidAt: new Date() });
    const { notifyEventTicketConfirmation } = await import("./notify-event-ticket-confirmation");
    notifyEventTicketConfirmation({
      eventId: event.id,
      userId: input.userId,
      centerId: input.centerId,
      amountCents: 0,
      currency: event.currency,
      quantity,
      kind: "purchase",
    }).catch((err) => console.error("[event-checkout] confirm email", err));
    return { success: true, ticket: paid ?? pending };
  }

  // Evento de pago: si el centro permite transferencia, devolvemos sólo el
  // ticket PENDING y el cliente redirige al selector inline.
  const center = await centerRepository.findById(input.centerId);
  const transferAllowed =
    !!center && center.bankTransferEnabled && center.bankTransferAcceptEvents;

  if (transferAllowed) {
    const ticket = await upsertTicket({
      existing,
      eventId: event.id,
      userId: input.userId,
      amountCents: totalAmountCents,
      currency: event.currency,
      quantity,
    });
    return {
      success: true,
      ticket,
      redirectTo: `/checkout-evento/${ticket.id}`,
    };
  }

  // Camino MP directo.
  const mpConfig = await mercadopagoConfigRepository.findByCenterId(input.centerId);
  if (!mpConfig || !mpConfig.enabled) {
    return { success: false, code: "MP_NOT_CONFIGURED", message: "MercadoPago no está configurado para este centro" };
  }

  const ticket = await upsertTicket({
    existing,
    eventId: event.id,
    userId: input.userId,
    amountCents: totalAmountCents,
    currency: event.currency,
    quantity,
  });

  const externalRef = `evt_${crypto.randomUUID()}`;
  await eventTicketRepository.setExternalReference(ticket.id, externalRef);

  const base = input.baseUrl.replace(/\/$/, "");
  const isHttps = base.startsWith("https://");
  const autoReturn = isHttps ? ("approved" as const) : undefined;

  const result = await mercadoPagoPaymentAdapter.createPreference({
    accessToken: mpConfig.accessToken,
    title: event.title,
    quantity,
    unitPrice: event.amountCents,
    externalReference: externalRef,
    backUrls: buildBackUrls(base, input.centerId, ticket.id),
    notificationUrl: `${base}/api/webhooks/mercadopago/${input.centerId}`,
    autoReturn,
    payerEmail: input.payerEmail,
    payerFirstName: input.payerFirstName,
    payerLastName: input.payerLastName,
    itemId: event.id,
    itemDescription: event.description ?? undefined,
    itemCategoryId: "tickets",
  });

  if (!result.success) {
    return { success: false, code: "MP_PREFERENCE_FAILED", message: result.error ?? "Error al crear preferencia de pago" };
  }

  return { success: true, ticket, checkoutUrl: result.checkoutUrl };
}

/**
 * Re-compra ("Agregar más cupos"). Requiere ticket PAID existente y suma
 * `delta` al quantity (free) o crea preferencia MP por el delta (pagado).
 */
async function processAddition(args: {
  input: CreateEventCheckoutInput;
  event: NonNullable<Awaited<ReturnType<typeof eventRepository.findById>>>;
  existing: EventTicket | null;
  delta: number;
}): Promise<EventCheckoutResult> {
  const { input, event, existing, delta } = args;

  if (!existing || existing.status !== "PAID") {
    return {
      success: false,
      code: "INVALID_MODE",
      message: "No tienes una entrada confirmada para agregar cupos",
    };
  }

  // Si hay una addition ya pendiente, no permitir otra en simultáneo.
  if (existing.pendingAdditionQuantity > 0) {
    return {
      success: false,
      code: "INVALID_MODE",
      message: "Ya tienes cupos adicionales pendientes de pago",
    };
  }

  // Capacidad: el ticket actual ya cuenta en paidSeats; el delta es lo que se SUMA.
  if (event.maxCapacity !== null) {
    const paidSeats = await eventTicketRepository.countPaidByEventId(event.id);
    const available = event.maxCapacity - paidSeats;
    if (available < delta) {
      return {
        success: false,
        code: "EVENT_FULL",
        message:
          available <= 0
            ? "El evento está lleno"
            : `Sólo quedan ${available} cupos disponibles`,
      };
    }
  }

  // Free: increment directo. Nunca toca MP.
  if (event.amountCents === 0) {
    const updated = await eventTicketRepository.incrementQuantity(existing.id, delta);
    if (!updated) {
      return { success: false, code: "INVALID_MODE", message: "No se pudo actualizar el ticket" };
    }
    const { notifyEventTicketConfirmation } = await import("./notify-event-ticket-confirmation");
    notifyEventTicketConfirmation({
      eventId: event.id,
      userId: input.userId,
      centerId: input.centerId,
      amountCents: 0,
      currency: event.currency,
      quantity: updated.quantity,
      kind: "addition",
      addedQuantity: delta,
    }).catch((err) => console.error("[event-checkout] addition email", err));
    return { success: true, ticket: updated };
  }

  // Pagado: crear preferencia MP por el delta. El webhook confirma.
  const mpConfig = await mercadopagoConfigRepository.findByCenterId(input.centerId);
  if (!mpConfig || !mpConfig.enabled) {
    return { success: false, code: "MP_NOT_CONFIGURED", message: "MercadoPago no está configurado para este centro" };
  }

  const externalRef = `evt_${crypto.randomUUID()}`;
  await eventTicketRepository.setPendingAdditionReference(existing.id, {
    reference: externalRef,
    quantity: delta,
  });

  const base = input.baseUrl.replace(/\/$/, "");
  const isHttps = base.startsWith("https://");
  const autoReturn = isHttps ? ("approved" as const) : undefined;

  const result = await mercadoPagoPaymentAdapter.createPreference({
    accessToken: mpConfig.accessToken,
    title: `${event.title} — cupos adicionales`,
    quantity: delta,
    unitPrice: event.amountCents,
    externalReference: externalRef,
    backUrls: buildBackUrls(base, input.centerId, existing.id),
    notificationUrl: `${base}/api/webhooks/mercadopago/${input.centerId}`,
    autoReturn,
    payerEmail: input.payerEmail,
    payerFirstName: input.payerFirstName,
    payerLastName: input.payerLastName,
    itemId: event.id,
    itemDescription: event.description ?? undefined,
    itemCategoryId: "tickets",
  });

  if (!result.success) {
    // Rollback parcial: limpiar los campos pending para no dejar el ticket
    // bloqueado a futuros reintentos.
    await eventTicketRepository.clearPendingAddition(existing.id).catch(() => {});
    return { success: false, code: "MP_PREFERENCE_FAILED", message: result.error ?? "Error al crear preferencia de pago" };
  }

  return { success: true, ticket: existing, checkoutUrl: result.checkoutUrl };
}

/**
 * Crea (o reusa) la preferencia MP para un EventTicket PENDING existente.
 * Usado desde el selector inline cuando la alumna elige tarjeta.
 */
export interface CreateMpPreferenceForTicketInput {
  ticketId: string;
  userId: string;
  baseUrl: string;
  payerEmail?: string;
  payerFirstName?: string;
  payerLastName?: string;
}

export type CreateMpPreferenceForTicketResult =
  | { success: true; checkoutUrl: string }
  | { success: false; code: EventCheckoutErrorCode | "TICKET_NOT_FOUND" | "TICKET_NOT_OWNED"; message: string };

export async function createMpPreferenceForTicket(
  input: CreateMpPreferenceForTicketInput,
): Promise<CreateMpPreferenceForTicketResult> {
  const ticket = await eventTicketRepository.findById(input.ticketId);
  if (!ticket) {
    return { success: false, code: "TICKET_NOT_FOUND", message: "Ticket no encontrado" };
  }
  if (ticket.userId !== input.userId) {
    return { success: false, code: "TICKET_NOT_OWNED", message: "Este ticket no es tuyo" };
  }
  if (ticket.status !== "PENDING") {
    return { success: false, code: "ALREADY_PURCHASED", message: "Este ticket ya no admite pago" };
  }

  const event = await eventRepository.findById(ticket.eventId);
  if (!event) {
    return { success: false, code: "EVENT_NOT_FOUND", message: "Evento no encontrado" };
  }

  const mpConfig = await mercadopagoConfigRepository.findByCenterId(event.centerId);
  if (!mpConfig || !mpConfig.enabled) {
    return {
      success: false,
      code: "MP_NOT_CONFIGURED",
      message: "MercadoPago no está configurado para este centro",
    };
  }

  const externalRef = `evt_${crypto.randomUUID()}`;
  await eventTicketRepository.setExternalReference(ticket.id, externalRef);

  const base = input.baseUrl.replace(/\/$/, "");
  const isHttps = base.startsWith("https://");
  const autoReturn = isHttps ? ("approved" as const) : undefined;

  const quantity = ticket.quantity > 0 ? ticket.quantity : 1;
  const unitPrice = Math.round(ticket.amountCents / quantity);

  const result = await mercadoPagoPaymentAdapter.createPreference({
    accessToken: mpConfig.accessToken,
    title: event.title,
    quantity,
    unitPrice,
    externalReference: externalRef,
    backUrls: buildBackUrls(base, event.centerId, ticket.id),
    notificationUrl: `${base}/api/webhooks/mercadopago/${event.centerId}`,
    autoReturn,
    payerEmail: input.payerEmail,
    payerFirstName: input.payerFirstName,
    payerLastName: input.payerLastName,
    itemId: event.id,
    itemDescription: event.description ?? undefined,
    itemCategoryId: "tickets",
  });

  if (!result.success || !result.checkoutUrl) {
    return {
      success: false,
      code: "MP_PREFERENCE_FAILED",
      message: result.error ?? "Error al crear preferencia de pago",
    };
  }

  return { success: true, checkoutUrl: result.checkoutUrl };
}
