import type { ILiveClassSeriesRepository, CreateSeriesInput, UpdateSeriesInput } from "@/lib/ports";
import type { LiveClassSeries, RepeatFrequency } from "@/lib/domain";
import { prisma } from "./prisma";

type PrismaSeries = {
  id: string;
  centerId: string;
  title: string;
  disciplineId: string | null;
  instructorId: string | null;
  maxCapacity: number;
  durationMinutes: number;
  isOnline: boolean;
  meetingUrl: string | null;
  isTrialClass: boolean;
  trialCapacity: number | null;
  color: string | null;
  classPassEnabled: boolean;
  classPassCapacity: number | null;
  repeatFrequency: string;
  repeatOnDaysOfWeek: number[];
  repeatEveryN: number;
  startsAt: Date;
  endsAt: Date | null;
  repeatCount: number | null;
  monthlyMode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(s: PrismaSeries): LiveClassSeries {
  return {
    id: s.id,
    centerId: s.centerId,
    title: s.title,
    disciplineId: s.disciplineId,
    instructorId: s.instructorId,
    maxCapacity: s.maxCapacity,
    durationMinutes: s.durationMinutes,
    isOnline: s.isOnline,
    meetingUrl: s.meetingUrl,
    isTrialClass: s.isTrialClass,
    trialCapacity: s.trialCapacity,
    color: s.color,
    classPassEnabled: s.classPassEnabled,
    classPassCapacity: s.classPassCapacity,
    repeatFrequency: s.repeatFrequency as RepeatFrequency,
    repeatOnDaysOfWeek: s.repeatOnDaysOfWeek,
    repeatEveryN: s.repeatEveryN,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    repeatCount: s.repeatCount,
    monthlyMode: s.monthlyMode,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const liveClassSeriesRepository: ILiveClassSeriesRepository = {
  async findById(id) {
    const s = await prisma.liveClassSeries.findUnique({ where: { id } });
    return s ? toDomain(s) : null;
  },

  async findManyByCenterId(centerId) {
    const list = await prisma.liveClassSeries.findMany({
      where: { centerId },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },

  async create(centerId, data) {
    const s = await prisma.liveClassSeries.create({
      data: {
        centerId,
        title: data.title,
        disciplineId: data.disciplineId ?? null,
        instructorId: data.instructorId ?? null,
        maxCapacity: data.maxCapacity,
        durationMinutes: data.durationMinutes,
        isOnline: data.isOnline ?? false,
        meetingUrl: data.meetingUrl ?? null,
        isTrialClass: data.isTrialClass ?? false,
        trialCapacity: data.trialCapacity ?? null,
        color: data.color ?? null,
        classPassEnabled: data.classPassEnabled ?? false,
        classPassCapacity: data.classPassCapacity ?? null,
        repeatFrequency: data.repeatFrequency,
        repeatOnDaysOfWeek: data.repeatOnDaysOfWeek,
        repeatEveryN: data.repeatEveryN ?? 1,
        startsAt: data.startsAt,
        endsAt: data.endsAt ?? null,
        repeatCount: data.repeatCount ?? null,
        monthlyMode: data.monthlyMode ?? null,
      },
    });
    return toDomain(s);
  },

  async update(id, centerId, data) {
    try {
      const s = await prisma.liveClassSeries.update({
        where: { id, centerId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.disciplineId !== undefined && { disciplineId: data.disciplineId }),
          ...(data.instructorId !== undefined && { instructorId: data.instructorId }),
          ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
          ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
          ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
          ...(data.meetingUrl !== undefined && { meetingUrl: data.meetingUrl }),
          ...(data.isTrialClass !== undefined && { isTrialClass: data.isTrialClass }),
          ...(data.trialCapacity !== undefined && { trialCapacity: data.trialCapacity }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
        },
      });
      return toDomain(s);
    } catch {
      return null;
    }
  },

  async delete(id, centerId) {
    try {
      await prisma.liveClassSeries.delete({ where: { id, centerId } });
      return true;
    } catch {
      return false;
    }
  },
};
