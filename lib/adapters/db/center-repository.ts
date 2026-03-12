import type { ICenterRepository, CenterPoliciesUpdate } from "@/lib/ports";
import type { Center } from "@/lib/domain";
import { prisma } from "./prisma";
function toDomainCenter(c: {
  id: string;
  name: string;
  slug: string;
  cancelBeforeHours: number;
  maxNoShowsPerMonth: number;
  bookBeforeHours: number;
  notifyWhenSlotFreed: boolean;
  instructorCanReserveForStudent: boolean;
  allowTrialClassPerPerson: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Center {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    cancelBeforeHours: c.cancelBeforeHours,
    maxNoShowsPerMonth: c.maxNoShowsPerMonth,
    bookBeforeHours: c.bookBeforeHours,
    notifyWhenSlotFreed: c.notifyWhenSlotFreed,
    instructorCanReserveForStudent: c.instructorCanReserveForStudent,
    allowTrialClassPerPerson: c.allowTrialClassPerPerson,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const centerRepository: ICenterRepository = {
  async findById(id: string) {
    const c = await prisma.center.findUnique({ where: { id } });
    return c ? toDomainCenter(c) : null;
  },

  async findBySlug(slug: string) {
    const c = await prisma.center.findUnique({ where: { slug } });
    return c ? toDomainCenter(c) : null;
  },

  async create(data: { name: string; slug: string }) {
    const c = await prisma.center.create({ data });
    return toDomainCenter(c);
  },

  async findAll() {
    const list = await prisma.center.findMany({ orderBy: { name: "asc" } });
    return list.map(toDomainCenter);
  },

  async updatePolicies(centerId: string, data: CenterPoliciesUpdate) {
    const payload: Record<string, unknown> = {};
    if (data.cancelBeforeHours !== undefined) payload.cancelBeforeHours = data.cancelBeforeHours;
    if (data.maxNoShowsPerMonth !== undefined) payload.maxNoShowsPerMonth = data.maxNoShowsPerMonth;
    if (data.bookBeforeHours !== undefined) payload.bookBeforeHours = data.bookBeforeHours;
    if (data.notifyWhenSlotFreed !== undefined) payload.notifyWhenSlotFreed = data.notifyWhenSlotFreed;
    if (data.instructorCanReserveForStudent !== undefined) payload.instructorCanReserveForStudent = data.instructorCanReserveForStudent;
    if (data.allowTrialClassPerPerson !== undefined) payload.allowTrialClassPerPerson = data.allowTrialClassPerPerson;
    const c = await prisma.center.update({
      where: { id: centerId },
      data: payload as Parameters<typeof prisma.center.update>[0]["data"],
    });
    return toDomainCenter(c);
  },
};
