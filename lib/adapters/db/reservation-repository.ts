import type { IReservationRepository } from "@/lib/ports";
import type { FindByUserIdPaginatedOptions, FindByUserIdAndCenterPaginatedOptions } from "@/lib/ports/reservation-repository";
import type { Reservation, ReservationStatus } from "@/lib/domain";
import { prisma } from "./prisma";

function toDomainReservation(r: {
  id: string;
  userId: string;
  liveClassId: string;
  userPlanId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Reservation {
  return {
    id: r.id,
    userId: r.userId,
    liveClassId: r.liveClassId,
    userPlanId: r.userPlanId,
    status: r.status as ReservationStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const reservationRepository: IReservationRepository = {
  async findById(id: string) {
    const r = await prisma.reservation.findUnique({ where: { id } });
    return r ? toDomainReservation(r) : null;
  },

  async findByUserAndLiveClass(userId: string, liveClassId: string) {
    const r = await prisma.reservation.findUnique({
      where: { userId_liveClassId: { userId, liveClassId } },
    });
    return r ? toDomainReservation(r) : null;
  },

  async findByUserId(userId: string, options?: { status?: ReservationStatus }) {
    const list = await prisma.reservation.findMany({
      where: { userId, ...(options?.status ? { status: options.status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomainReservation);
  },

  async findByUserIdPaginated(userId: string, options: FindByUserIdPaginatedOptions) {
    const where = { userId, ...(options.status ? { status: options.status } : {}) };
    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit,
        skip: options.offset,
      }),
      prisma.reservation.count({ where }),
    ]);
    return { items: items.map(toDomainReservation), total };
  },

  async findByUserIdAndCenterPaginated(userId: string, options: FindByUserIdAndCenterPaginatedOptions) {
    const statusFilter =
      options.statuses && options.statuses.length > 0
        ? { status: { in: options.statuses } }
        : options.status
          ? { status: options.status }
          : {};
    const where = {
      userId,
      ...statusFilter,
      liveClass: { centerId: options.centerId },
    };
    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit,
        skip: options.offset,
      }),
      prisma.reservation.count({ where }),
    ]);
    return { items: items.map(toDomainReservation), total };
  },

  async countByUserAndStatus(userId: string, centerId: string, status: ReservationStatus, since: Date) {
    return prisma.reservation.count({
      where: {
        userId,
        status,
        updatedAt: { gte: since },
        liveClass: { centerId },
      },
    });
  },

  async hasTrialReservation(userId: string, centerId: string) {
    const count = await prisma.reservation.count({
      where: {
        userId,
        liveClass: { centerId, isTrialClass: true },
        status: { in: ["CONFIRMED", "ATTENDED"] },
      },
    });
    return count > 0;
  },

  async create(data: { userId: string; liveClassId: string; userPlanId?: string | null }) {
    const r = await prisma.reservation.create({
      data: {
        userId: data.userId,
        liveClassId: data.liveClassId,
        userPlanId: data.userPlanId ?? null,
      },
    });
    return toDomainReservation(r);
  },

  async updateStatus(id: string, status: ReservationStatus) {
    const r = await prisma.reservation.update({
      where: { id },
      data: { status },
    });
    return toDomainReservation(r);
  },
};
