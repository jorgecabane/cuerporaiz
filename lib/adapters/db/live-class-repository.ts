import type { ILiveClassRepository, CreateLiveClassInput, UpdateLiveClassInput } from "@/lib/ports";
import type { LiveClass, LiveClassStatus } from "@/lib/domain";
import { prisma } from "./prisma";

type PrismaLiveClass = {
  id: string;
  centerId: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  maxCapacity: number;
  disciplineId: string | null;
  instructorId: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  isTrialClass: boolean;
  trialCapacity: number | null;
  color: string | null;
  classPassEnabled: boolean;
  classPassCapacity: number | null;
  seriesId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(c: PrismaLiveClass): LiveClass {
  return {
    id: c.id,
    centerId: c.centerId,
    title: c.title,
    startsAt: c.startsAt,
    durationMinutes: c.durationMinutes,
    maxCapacity: c.maxCapacity,
    disciplineId: c.disciplineId,
    instructorId: c.instructorId,
    isOnline: c.isOnline,
    meetingUrl: c.meetingUrl,
    isTrialClass: c.isTrialClass,
    trialCapacity: c.trialCapacity,
    color: c.color,
    classPassEnabled: c.classPassEnabled,
    classPassCapacity: c.classPassCapacity,
    seriesId: c.seriesId,
    status: c.status as LiveClassStatus,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const liveClassRepository: ILiveClassRepository = {
  async findById(id) {
    const c = await prisma.liveClass.findUnique({ where: { id } });
    return c ? toDomain(c) : null;
  },

  async findByCenterId(centerId, from?) {
    const list = await prisma.liveClass.findMany({
      where: {
        centerId,
        status: "ACTIVE",
        ...(from ? { startsAt: { gte: from } } : {}),
      },
      orderBy: { startsAt: "asc" },
    });
    return list.map(toDomain);
  },

  async findByCenterIdPaginated(centerId, from, { limit, offset }) {
    const where = {
      centerId,
      status: "ACTIVE" as const,
      ...(from ? { startsAt: { gte: from } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.liveClass.findMany({
        where,
        orderBy: { startsAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.liveClass.count({ where }),
    ]);
    return { items: items.map(toDomain), total };
  },

  async findByCenterIdAndRange(centerId, from, to, instructorId?) {
    const list = await prisma.liveClass.findMany({
      where: {
        centerId,
        status: "ACTIVE",
        startsAt: { gte: from, lt: to },
        ...(instructorId != null ? { instructorId } : {}),
      },
      orderBy: { startsAt: "asc" },
    });
    return list.map(toDomain);
  },

  async findBySeriesId(seriesId) {
    const list = await prisma.liveClass.findMany({
      where: { seriesId, status: "ACTIVE" },
      orderBy: { startsAt: "asc" },
    });
    return list.map(toDomain);
  },

  async countConfirmedReservations(liveClassId) {
    return prisma.reservation.count({
      where: { liveClassId, status: "CONFIRMED" },
    });
  },

  async create(centerId, data) {
    const c = await prisma.liveClass.create({
      data: {
        centerId,
        title: data.title,
        startsAt: data.startsAt,
        durationMinutes: data.durationMinutes,
        maxCapacity: data.maxCapacity,
        disciplineId: data.disciplineId ?? null,
        instructorId: data.instructorId ?? null,
        isOnline: data.isOnline ?? false,
        meetingUrl: data.meetingUrl ?? null,
        isTrialClass: data.isTrialClass ?? false,
        trialCapacity: data.trialCapacity ?? null,
        color: data.color ?? null,
        classPassEnabled: data.classPassEnabled ?? false,
        classPassCapacity: data.classPassCapacity ?? null,
        seriesId: data.seriesId ?? null,
      },
    });
    return toDomain(c);
  },

  async createMany(centerId, dataArr) {
    const result = await prisma.liveClass.createMany({
      data: dataArr.map((d) => ({
        centerId,
        title: d.title,
        startsAt: d.startsAt,
        durationMinutes: d.durationMinutes,
        maxCapacity: d.maxCapacity,
        disciplineId: d.disciplineId ?? null,
        instructorId: d.instructorId ?? null,
        isOnline: d.isOnline ?? false,
        meetingUrl: d.meetingUrl ?? null,
        isTrialClass: d.isTrialClass ?? false,
        trialCapacity: d.trialCapacity ?? null,
        color: d.color ?? null,
        classPassEnabled: d.classPassEnabled ?? false,
        classPassCapacity: d.classPassCapacity ?? null,
        seriesId: d.seriesId ?? null,
      })),
    });
    return result.count;
  },

  async update(id, centerId, data) {
    try {
      const c = await prisma.liveClass.update({
        where: { id, centerId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
          ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
          ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
          ...(data.disciplineId !== undefined && { disciplineId: data.disciplineId }),
          ...(data.instructorId !== undefined && { instructorId: data.instructorId }),
          ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
          ...(data.meetingUrl !== undefined && { meetingUrl: data.meetingUrl }),
          ...(data.isTrialClass !== undefined && { isTrialClass: data.isTrialClass }),
          ...(data.trialCapacity !== undefined && { trialCapacity: data.trialCapacity }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.classPassEnabled !== undefined && { classPassEnabled: data.classPassEnabled }),
          ...(data.classPassCapacity !== undefined && { classPassCapacity: data.classPassCapacity }),
          ...(data.seriesId !== undefined && { seriesId: data.seriesId }),
          ...(data.status !== undefined && { status: data.status }),
        },
      });
      return toDomain(c);
    } catch {
      return null;
    }
  },

  async updateManyBySeriesId(seriesId, centerId, data) {
    const result = await prisma.liveClass.updateMany({
      where: { seriesId, centerId, status: "ACTIVE" },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
        ...(data.disciplineId !== undefined && { disciplineId: data.disciplineId }),
        ...(data.instructorId !== undefined && { instructorId: data.instructorId }),
        ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
        ...(data.meetingUrl !== undefined && { meetingUrl: data.meetingUrl }),
        ...(data.isTrialClass !== undefined && { isTrialClass: data.isTrialClass }),
        ...(data.trialCapacity !== undefined && { trialCapacity: data.trialCapacity }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    return result.count;
  },

  async updateManyByIds(ids, centerId, data) {
    if (ids.length === 0) return 0;
    const result = await prisma.liveClass.updateMany({
      where: { id: { in: ids }, centerId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
        ...(data.disciplineId !== undefined && { disciplineId: data.disciplineId }),
        ...(data.instructorId !== undefined && { instructorId: data.instructorId }),
        ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
        ...(data.meetingUrl !== undefined && { meetingUrl: data.meetingUrl }),
        ...(data.isTrialClass !== undefined && { isTrialClass: data.isTrialClass }),
        ...(data.trialCapacity !== undefined && { trialCapacity: data.trialCapacity }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    return result.count;
  },

  async deleteBySeriesIdFromDate(seriesId, centerId, fromDate) {
    const result = await prisma.liveClass.deleteMany({
      where: {
        seriesId,
        centerId,
        startsAt: { gte: fromDate },
        status: "ACTIVE",
      },
    });
    return result.count;
  },

  async delete(id, centerId) {
    try {
      await prisma.liveClass.delete({ where: { id, centerId } });
      return true;
    } catch {
      return false;
    }
  },
};
