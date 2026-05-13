import type { IEventTicketRepository } from "@/lib/ports/event-ticket-repository";
import type { EventTicket, EventTicketStatus } from "@/lib/domain/event";
import { prisma } from "./prisma";
import type { EventTicketStatus as PrismaEventTicketStatus } from "@prisma/client";

function toDomain(r: {
  id: string;
  eventId: string;
  userId: string;
  amountCents: number;
  quantity: number;
  currency: string;
  status: PrismaEventTicketStatus;
  mpPaymentId: string | null;
  externalReference: string | null;
  pendingAdditionQuantity: number;
  pendingAdditionExternalReference: string | null;
  orderId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}): EventTicket {
  return {
    id: r.id,
    eventId: r.eventId,
    userId: r.userId,
    amountCents: r.amountCents,
    quantity: r.quantity,
    currency: r.currency,
    status: r.status as unknown as EventTicketStatus,
    mpPaymentId: r.mpPaymentId,
    externalReference: r.externalReference,
    pendingAdditionQuantity: r.pendingAdditionQuantity,
    pendingAdditionExternalReference: r.pendingAdditionExternalReference,
    orderId: r.orderId,
    paidAt: r.paidAt,
    createdAt: r.createdAt,
  };
}

export const eventTicketRepository: IEventTicketRepository = {
  async findById(id: string) {
    const r = await prisma.eventTicket.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async findByEventId(eventId: string) {
    const list = await prisma.eventTicket.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
    return list.map(toDomain);
  },

  async findByUserId(userId: string) {
    const list = await prisma.eventTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },

  async findByEventAndUser(eventId: string, userId: string) {
    const r = await prisma.eventTicket.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return r ? toDomain(r) : null;
  },

  async findByExternalReference(reference: string) {
    if (!reference) return null;
    // Primero compra inicial; si no, re-compra.
    const initial = await prisma.eventTicket.findUnique({
      where: { externalReference: reference },
    });
    if (initial) return { ticket: toDomain(initial), isAddition: false };
    const addition = await prisma.eventTicket.findUnique({
      where: { pendingAdditionExternalReference: reference },
    });
    if (addition) return { ticket: toDomain(addition), isAddition: true };
    return null;
  },

  async findByMpPaymentId(mpPaymentId: string) {
    if (!mpPaymentId) return null;
    const r = await prisma.eventTicket.findFirst({
      where: { mpPaymentId },
    });
    return r ? toDomain(r) : null;
  },

  async create(data: {
    eventId: string;
    userId: string;
    amountCents: number;
    currency: string;
    quantity?: number;
  }) {
    const r = await prisma.eventTicket.create({
      data: {
        eventId: data.eventId,
        userId: data.userId,
        amountCents: data.amountCents,
        currency: data.currency,
        quantity: data.quantity ?? 1,
      },
    });
    return toDomain(r);
  },

  async resetPending(
    id: string,
    data: { amountCents: number; quantity: number; currency: string }
  ) {
    const existing = await prisma.eventTicket.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.eventTicket.update({
      where: { id },
      data: {
        amountCents: data.amountCents,
        quantity: data.quantity,
        currency: data.currency,
        status: "PENDING",
        mpPaymentId: null,
        paidAt: null,
        transferClaimedAt: null,
        transferReceiptSanityId: null,
        transferRejectedReason: null,
        // No tocamos externalReference acá: createEventCheckout lo setea con
        // el nuevo ref justo después.
      },
    });
    return toDomain(r);
  },

  async setExternalReference(id: string, reference: string) {
    const existing = await prisma.eventTicket.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.eventTicket.update({
      where: { id },
      data: { externalReference: reference },
    });
    return toDomain(r);
  },

  async setPendingAdditionReference(
    id: string,
    data: { reference: string; quantity: number }
  ) {
    const existing = await prisma.eventTicket.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.eventTicket.update({
      where: { id },
      data: {
        pendingAdditionExternalReference: data.reference,
        pendingAdditionQuantity: data.quantity,
      },
    });
    return toDomain(r);
  },

  async incrementQuantity(id: string, delta: number) {
    const existing = await prisma.eventTicket.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.eventTicket.update({
      where: { id },
      data: { quantity: { increment: delta } },
    });
    return toDomain(r);
  },

  async applyApprovedPayment(
    id: string,
    data: { mpPaymentId: string; isAddition: boolean }
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.eventTicket.findUnique({ where: { id } });
      if (!existing) return null;
      const addedQuantity = data.isAddition ? existing.pendingAdditionQuantity : 0;
      const updateData: Record<string, unknown> = {
        status: "PAID" satisfies PrismaEventTicketStatus,
        mpPaymentId: data.mpPaymentId,
        paidAt: existing.paidAt ?? new Date(),
      };
      if (data.isAddition) {
        updateData.quantity = { increment: addedQuantity };
        updateData.pendingAdditionQuantity = 0;
        updateData.pendingAdditionExternalReference = null;
      }
      const r = await tx.eventTicket.update({
        where: { id },
        data: updateData,
      });
      return { ticket: toDomain(r), addedQuantity };
    });
  },

  async clearPendingAddition(id: string) {
    const existing = await prisma.eventTicket.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.eventTicket.update({
      where: { id },
      data: {
        pendingAdditionQuantity: 0,
        pendingAdditionExternalReference: null,
      },
    });
    return toDomain(r);
  },

  async updateStatus(
    id: string,
    status: EventTicketStatus,
    extra?: { mpPaymentId?: string; paidAt?: Date }
  ) {
    const existing = await prisma.eventTicket.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.eventTicket.update({
      where: { id },
      data: {
        status: status as PrismaEventTicketStatus,
        ...(extra?.mpPaymentId != null && { mpPaymentId: extra.mpPaymentId }),
        ...(extra?.paidAt != null && { paidAt: extra.paidAt }),
      },
    });
    return toDomain(r);
  },

  async countPaidByEventId(eventId: string) {
    const result = await prisma.eventTicket.aggregate({
      where: { eventId, status: "PAID" },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  },
};
