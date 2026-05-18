import type {
  IWaitlistRepository,
  CreateWaitlistEntryInput,
  WaitlistKind,
  PromoteToReservationResult,
  PromoteToEventHoldResult,
} from "@/lib/ports/waitlist-repository";
import type { WaitlistEntry } from "@/lib/domain/waitlist-entry";
import type { WaitlistStatus } from "@/lib/domain/waitlist";
import { prisma } from "./prisma";

const ACTIVE_STATUSES: WaitlistStatus[] = ["QUEUED", "NOTIFIED", "HELD"];

type DbWaitlistEntry = {
  id: string;
  userId: string;
  centerId: string;
  liveClassId: string | null;
  eventId: string | null;
  status: string;
  position: number;
  notifiedAt: Date | null;
  heldUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(e: DbWaitlistEntry): WaitlistEntry {
  return {
    id: e.id,
    userId: e.userId,
    centerId: e.centerId,
    liveClassId: e.liveClassId,
    eventId: e.eventId,
    status: e.status as WaitlistStatus,
    position: e.position,
    notifiedAt: e.notifiedAt,
    heldUntil: e.heldUntil,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function whereForItem(kind: WaitlistKind, itemId: string) {
  return kind === "class" ? { liveClassId: itemId } : { eventId: itemId };
}

export const waitlistRepository: IWaitlistRepository = {
  async create(input: CreateWaitlistEntryInput) {
    // FIFO position: cuenta total de entries (incluyendo terminales) para mantener
    // el orden histórico aún si alguien sale o gana cupo.
    //
    // Envuelto en transacción + advisory lock por itemId para serializar la
    // asignación de position entre joins concurrentes; comparte el mismo lock
    // que promoteToClassReservation/promoteToEventHold, así que un join no
    // puede correr en paralelo a una promoción del mismo item.
    const itemFilter = whereForItem(input.kind, input.itemId);
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.itemId}, 0))`;
      const count = await tx.waitlistEntry.count({ where: itemFilter });
      const created = await tx.waitlistEntry.create({
        data: {
          userId: input.userId,
          centerId: input.centerId,
          liveClassId: input.kind === "class" ? input.itemId : null,
          eventId: input.kind === "event" ? input.itemId : null,
          status: "QUEUED",
          position: count + 1,
        },
      });
      return toDomain(created);
    });
  },

  async findById(id) {
    const e = await prisma.waitlistEntry.findUnique({ where: { id } });
    return e ? toDomain(e) : null;
  },

  async findByUserAndItem(userId, kind, itemId) {
    const where =
      kind === "class"
        ? { userId_liveClassId: { userId, liveClassId: itemId } }
        : { userId_eventId: { userId, eventId: itemId } };
    const e = await prisma.waitlistEntry.findUnique({ where });
    return e ? toDomain(e) : null;
  },

  async findActiveByUserId(userId, centerId) {
    const list = await prisma.waitlistEntry.findMany({
      where: { userId, centerId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },

  async findActiveByItem(kind, itemId) {
    const list = await prisma.waitlistEntry.findMany({
      where: { ...whereForItem(kind, itemId), status: { in: ACTIVE_STATUSES } },
      orderBy: { position: "asc" },
    });
    return list.map(toDomain);
  },

  async findByItem(kind, itemId, options) {
    const where = {
      ...whereForItem(kind, itemId),
      ...(options?.includeTerminal ? {} : { status: { in: ACTIVE_STATUSES } }),
    };
    const list = await prisma.waitlistEntry.findMany({
      where,
      orderBy: { position: "asc" },
    });
    return list.map(toDomain);
  },

  async updateStatus(id, status) {
    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: { status },
    });
    return toDomain(updated);
  },

  async markNotified(id, now) {
    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: { status: "NOTIFIED", notifiedAt: now },
    });
    return toDomain(updated);
  },

  async cancelActiveByLiveClassId(liveClassId) {
    const active = await prisma.waitlistEntry.findMany({
      where: { liveClassId, status: { in: ACTIVE_STATUSES } },
    });
    if (active.length === 0) return [];
    await prisma.waitlistEntry.updateMany({
      where: { liveClassId, status: { in: ACTIVE_STATUSES } },
      data: { status: "CANCELLED" },
    });
    return active.map(toDomain);
  },

  async expireEventHolds(eventId, now) {
    const expired = await prisma.waitlistEntry.findMany({
      where: { eventId, status: "HELD", heldUntil: { lt: now } },
      select: { id: true, userId: true },
    });
    if (expired.length === 0) return [];
    const ids = expired.map((e) => e.id);
    const userIds = expired.map((e) => e.userId);
    await prisma.$transaction([
      prisma.waitlistEntry.updateMany({
        where: { id: { in: ids } },
        data: { status: "EXPIRED" },
      }),
      prisma.eventTicket.updateMany({
        where: { eventId, status: "PENDING", userId: { in: userIds } },
        data: { status: "CANCELLED" },
      }),
    ]);
    return ids;
  },

  async promoteToClassReservation({
    entryId,
    userId,
    liveClassId,
    maxCapacity,
    userPlanId,
    userPlanIdToConsume,
  }): Promise<PromoteToReservationResult> {
    return prisma.$transaction(async (tx) => {
      // Advisory lock por liveClassId: serializa promotes para esta clase.
      // hashtextextended devuelve un bigint estable a partir de un text.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${liveClassId}, 0))`;

      const confirmed = await tx.reservation.count({
        where: { liveClassId, status: "CONFIRMED" },
      });
      if (confirmed >= maxCapacity) {
        return { success: false, reason: "spot_taken" } as const;
      }

      // Si el usuario ya tenía una reserva CANCELLED, la "reabrimos" en vez de
      // crear duplicada (la unique constraint userId+liveClassId no lo permite).
      const existing = await tx.reservation.findUnique({
        where: { userId_liveClassId: { userId, liveClassId } },
      });
      let reservationId: string;
      if (existing !== null) {
        const updated = await tx.reservation.update({
          where: { id: existing.id },
          data: { status: "CONFIRMED", userPlanId: userPlanId ?? null },
        });
        reservationId = updated.id;
      } else {
        const created = await tx.reservation.create({
          data: {
            userId,
            liveClassId,
            userPlanId: userPlanId ?? null,
            status: "CONFIRMED",
          },
        });
        reservationId = created.id;
      }

      await tx.waitlistEntry.update({
        where: { id: entryId },
        data: { status: "PROMOTED" },
      });

      // Decrementa clase del plan en la MISMA transacción para evitar
      // inconsistencias (reservation creada pero plan no consumido).
      if (userPlanIdToConsume !== null) {
        await tx.userPlan.update({
          where: { id: userPlanIdToConsume },
          data: { classesUsed: { increment: 1 } },
        });
      }

      return { success: true, reservationId } as const;
    });
  },

  async promoteToEventHold({
    entryId,
    userId,
    eventId,
    maxCapacity,
    amountCents,
    currency,
    paymentMethod,
    holdUntil,
  }): Promise<PromoteToEventHoldResult> {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))`;

      const paid = await tx.eventTicket.count({
        where: { eventId, status: "PAID" },
      });
      const heldActive = await tx.waitlistEntry.count({
        where: { eventId, status: "HELD", heldUntil: { gt: now } },
      });
      if (paid + heldActive >= maxCapacity) {
        return { success: false, reason: "spot_taken" } as const;
      }

      // EventTicket existente del usuario (CANCELLED, REFUNDED): lo reabrimos
      const existingTicket = await tx.eventTicket.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      let ticketId: string;
      if (existingTicket !== null) {
        const updated = await tx.eventTicket.update({
          where: { id: existingTicket.id },
          data: {
            status: "PENDING",
            amountCents,
            currency,
            paymentMethod,
          },
        });
        ticketId = updated.id;
      } else {
        const created = await tx.eventTicket.create({
          data: {
            eventId,
            userId,
            amountCents,
            currency,
            paymentMethod,
            status: "PENDING",
          },
        });
        ticketId = created.id;
      }

      await tx.waitlistEntry.update({
        where: { id: entryId },
        data: { status: "HELD", heldUntil: holdUntil },
      });

      return { success: true, ticketId, heldUntil: holdUntil } as const;
    });
  },

  async countActiveHoldsByEventId(eventId, now) {
    return prisma.waitlistEntry.count({
      where: { eventId, status: "HELD", heldUntil: { gt: now } },
    });
  },
};
