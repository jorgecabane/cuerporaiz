import type { ICenterHolidayRepository, CreateHolidayInput } from "@/lib/ports/center-holiday-repository";
import type { CenterHoliday } from "@/lib/domain/center-holiday";
import { prisma } from "./prisma";

type PrismaHoliday = {
  id: string;
  centerId: string;
  date: Date;
  label: string | null;
  createdAt: Date;
};

function toDomain(h: PrismaHoliday): CenterHoliday {
  return {
    id: h.id,
    centerId: h.centerId,
    date: h.date,
    label: h.label,
    createdAt: h.createdAt,
  };
}

export const centerHolidayRepository: ICenterHolidayRepository = {
  async findByCenterId(centerId) {
    const list = await prisma.centerHoliday.findMany({
      where: { centerId },
      orderBy: { date: "asc" },
    });
    return list.map(toDomain);
  },

  async findByCenterIdAndDate(centerId, date) {
    const h = await prisma.centerHoliday.findUnique({
      where: { centerId_date: { centerId, date } },
    });
    return h ? toDomain(h) : null;
  },

  async create(centerId, data) {
    const h = await prisma.centerHoliday.create({
      data: {
        centerId,
        date: data.date,
        label: data.label ?? null,
      },
    });
    return toDomain(h);
  },

  async delete(id, centerId) {
    try {
      await prisma.centerHoliday.delete({ where: { id, centerId } });
      return true;
    } catch {
      return false;
    }
  },
};
