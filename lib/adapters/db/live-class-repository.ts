import type { ILiveClassRepository } from "@/lib/ports";
import type { LiveClass } from "@/lib/domain";
import { prisma } from "./prisma";

function toDomainLiveClass(c: {
  id: string;
  centerId: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  maxCapacity: number;
  createdAt: Date;
  updatedAt: Date;
}): LiveClass {
  return {
    id: c.id,
    centerId: c.centerId,
    title: c.title,
    startsAt: c.startsAt,
    durationMinutes: c.durationMinutes,
    maxCapacity: c.maxCapacity,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const liveClassRepository: ILiveClassRepository = {
  async findById(id: string) {
    const c = await prisma.liveClass.findUnique({ where: { id } });
    return c ? toDomainLiveClass(c) : null;
  },

  async findByCenterId(centerId: string, from?: Date) {
    const list = await prisma.liveClass.findMany({
      where: {
        centerId,
        ...(from ? { startsAt: { gte: from } } : {}),
      },
      orderBy: { startsAt: "asc" },
    });
    return list.map(toDomainLiveClass);
  },

  async countConfirmedReservations(liveClassId: string) {
    return prisma.reservation.count({
      where: { liveClassId, status: "CONFIRMED" },
    });
  },
};
