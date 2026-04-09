import type { IEventTicketRepository } from "@/lib/ports/event-ticket-repository";
import type { EventTicket, EventTicketStatus } from "@/lib/domain/event";
import { prisma } from "./prisma";
import type { EventTicketStatus as PrismaEventTicketStatus } from "@prisma/client";

function toDomain(r: {
  id: string;
  eventId: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: PrismaEventTicketStatus;
  mpPaymentId: string | null;
  orderId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}): EventTicket {
  return {
    id: r.id,
    eventId: r.eventId,
    userId: r.userId,
    amountCents: r.amountCents,
    currency: r.currency,
    status: r.status as unknown as EventTicketStatus,
    mpPaymentId: r.mpPaymentId,
    orderId: r.orderId,
    paidAt: r.paidAt,
    createdAt: r.createdAt,
  };
}

export const eventTicketRepository: IEventTicketRepository = {
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

  async create(data: { eventId: string; userId: string; amountCents: number; currency: string }) {
    const r = await prisma.eventTicket.create({
      data: {
        eventId: data.eventId,
        userId: data.userId,
        amountCents: data.amountCents,
        currency: data.currency,
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
    return prisma.eventTicket.count({
      where: { eventId, status: "PAID" },
    });
  },
};
