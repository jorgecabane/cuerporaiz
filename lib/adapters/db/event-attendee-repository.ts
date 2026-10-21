import * as crypto from "node:crypto";
import type { IEventAttendeeRepository } from "@/lib/ports/event-attendee-repository";
import { prisma } from "./prisma";

const newToken = () => crypto.randomBytes(32).toString("base64url");

const SELECT = {
  id: true,
  ticketId: true,
  seat: true,
  token: true,
  name: true,
  email: true,
  firstEnteredAt: true,
  lastEnteredAt: true,
  revokedAt: true,
} as const;

export const eventAttendeeRepository: IEventAttendeeRepository = {
  async findByToken(token) {
    return prisma.eventAttendee.findUnique({ where: { token }, select: SELECT });
  },

  async findByTicketId(ticketId) {
    return prisma.eventAttendee.findMany({ where: { ticketId }, select: SELECT, orderBy: { seat: "asc" } });
  },

  async replaceForTicket(ticketId, seats) {
    await prisma.$transaction([
      prisma.eventAttendee.deleteMany({ where: { ticketId } }),
      prisma.eventAttendee.createMany({
        data: seats.map((s, i) => ({ ticketId, seat: i + 1, token: newToken(), name: s.name, email: s.email })),
      }),
    ]);
  },

  async createMissingSeats(ticketId, quantity) {
    const last = await prisma.eventAttendee.aggregate({ where: { ticketId }, _max: { seat: true } });
    const from = (last._max.seat ?? 0) + 1;
    if (from > quantity) return;
    const data = [];
    for (let seat = from; seat <= quantity; seat++) data.push({ ticketId, seat, token: newToken() });
    // skipDuplicates: dos confirmaciones concurrentes no chocan en (ticketId, seat).
    await prisma.eventAttendee.createMany({ data, skipDuplicates: true });
  },

  async recordEntry(id, at) {
    await prisma.$executeRaw`UPDATE "EventAttendee" SET "firstEnteredAt" = COALESCE("firstEnteredAt", ${at}), "lastEnteredAt" = ${at} WHERE "id" = ${id}`;
  },

  async revoke(id, centerId) {
    const r = await prisma.eventAttendee.updateMany({
      where: { id, revokedAt: null, ticket: { event: { centerId } } },
      data: { revokedAt: new Date() },
    });
    return r.count > 0;
  },
};
