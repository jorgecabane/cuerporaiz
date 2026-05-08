/**
 * Caso de uso: checkout de eventos (entrada libre o con pago MercadoPago).
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
  | "MP_NOT_CONFIGURED"
  | "MP_PREFERENCE_FAILED";

export type EventCheckoutResult =
  | { success: true; ticket: EventTicket; checkoutUrl?: string; redirectTo?: string }
  | { success: false; code: EventCheckoutErrorCode; message: string };

export interface CreateEventCheckoutInput {
  eventId: string;
  centerId: string;
  userId: string;
  baseUrl: string;
  payerEmail?: string;
  payerFirstName?: string;
  payerLastName?: string;
}

/**
 * Crea un ticket de evento: gratis → PAID directo; de pago → PENDING + URL MP.
 */
export async function createEventCheckout(
  input: CreateEventCheckoutInput
): Promise<EventCheckoutResult> {
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
  if (existing && existing.status === "PAID") {
    return { success: false, code: "ALREADY_PURCHASED", message: "Ya tienes una entrada para este evento" };
  }

  if (event.maxCapacity !== null) {
    const paidCount = await eventTicketRepository.countPaidByEventId(event.id);
    if (paidCount >= event.maxCapacity) {
      return { success: false, code: "EVENT_FULL", message: "El evento está lleno" };
    }
  }

  // Evento gratuito: crear ticket PAID directamente
  if (event.amountCents === 0) {
    const ticket = await eventTicketRepository.create({
      eventId: event.id,
      userId: input.userId,
      amountCents: 0,
      currency: event.currency,
    });
    const paid = await eventTicketRepository.updateStatus(ticket.id, "PAID", { paidAt: new Date() });
    const { notifyEventTicketConfirmation } = await import("./notify-event-ticket-confirmation");
    notifyEventTicketConfirmation({
      eventId: event.id,
      userId: input.userId,
      centerId: input.centerId,
      amountCents: 0,
      currency: event.currency,
    }).catch((err) => console.error("[event-checkout] confirm email", err));
    return { success: true, ticket: paid ?? ticket };
  }

  // Evento de pago: si el centro permite transferencia, devolvemos sólo el
  // ticket PENDING y el cliente redirige al selector inline. La preferencia
  // MP se crea cuando la alumna elige "Continuar a MercadoPago".
  const center = await centerRepository.findById(input.centerId);
  const transferAllowed =
    !!center && center.bankTransferEnabled && center.bankTransferAcceptEvents;

  if (transferAllowed) {
    const ticket = await eventTicketRepository.create({
      eventId: event.id,
      userId: input.userId,
      amountCents: event.amountCents,
      currency: event.currency,
    });
    return {
      success: true,
      ticket,
      redirectTo: `/checkout-evento/${ticket.id}`,
    };
  }

  // Camino tradicional: crear ticket + preferencia MP en un sólo paso.
  const mpConfig = await mercadopagoConfigRepository.findByCenterId(input.centerId);
  if (!mpConfig || !mpConfig.enabled) {
    return { success: false, code: "MP_NOT_CONFIGURED", message: "MercadoPago no está configurado para este centro" };
  }

  const ticket = await eventTicketRepository.create({
    eventId: event.id,
    userId: input.userId,
    amountCents: event.amountCents,
    currency: event.currency,
  });

  const externalRef = `evt_${crypto.randomUUID()}`;
  const base = input.baseUrl.replace(/\/$/, "");
  const isHttps = base.startsWith("https://");
  const autoReturn = isHttps ? ("approved" as const) : undefined;

  const result = await mercadoPagoPaymentAdapter.createPreference({
    accessToken: mpConfig.accessToken,
    title: event.title,
    quantity: 1,
    unitPrice: event.amountCents,
    externalReference: externalRef,
    backUrls: {
      success: `${base}/api/events/checkout/success?centerId=${input.centerId}&ticketId=${ticket.id}`,
      failure: `${base}/api/events/checkout/failure?centerId=${input.centerId}&ticketId=${ticket.id}`,
      pending: `${base}/api/events/checkout/pending?centerId=${input.centerId}&ticketId=${ticket.id}`,
    },
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
  const base = input.baseUrl.replace(/\/$/, "");
  const isHttps = base.startsWith("https://");
  const autoReturn = isHttps ? ("approved" as const) : undefined;

  const result = await mercadoPagoPaymentAdapter.createPreference({
    accessToken: mpConfig.accessToken,
    title: event.title,
    quantity: 1,
    unitPrice: event.amountCents,
    externalReference: externalRef,
    backUrls: {
      success: `${base}/api/events/checkout/success?centerId=${event.centerId}&ticketId=${ticket.id}`,
      failure: `${base}/api/events/checkout/failure?centerId=${event.centerId}&ticketId=${ticket.id}`,
      pending: `${base}/api/events/checkout/pending?centerId=${event.centerId}&ticketId=${ticket.id}`,
    },
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
