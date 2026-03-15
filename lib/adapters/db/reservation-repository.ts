import type { IReservationRepository } from "@/lib/ports";
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
