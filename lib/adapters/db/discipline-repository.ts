import type { IDisciplineRepository, CreateDisciplineInput, UpdateDisciplineInput } from "@/lib/ports";
import type { Discipline } from "@/lib/domain";
import { prisma } from "./prisma";

function toDomain(d: {
  id: string;
  centerId: string;
  name: string;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Discipline {
  return {
    id: d.id,
    centerId: d.centerId,
    name: d.name,
    color: d.color,
    active: d.active,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const disciplineRepository: IDisciplineRepository = {
  async findById(id) {
    const d = await prisma.discipline.findUnique({ where: { id } });
    return d ? toDomain(d) : null;
  },

  async findManyByCenterId(centerId) {
    const list = await prisma.discipline.findMany({
      where: { centerId },
      orderBy: { name: "asc" },
    });
    return list.map(toDomain);
  },

  async findActiveByCenterId(centerId) {
    const list = await prisma.discipline.findMany({
      where: { centerId, active: true },
      orderBy: { name: "asc" },
    });
    return list.map(toDomain);
  },

  async create(centerId, data) {
    const d = await prisma.discipline.create({
      data: {
        centerId,
        name: data.name,
        color: data.color ?? null,
        active: data.active ?? true,
      },
    });
    return toDomain(d);
  },

  async update(id, centerId, data) {
    try {
      const d = await prisma.discipline.update({
        where: { id, centerId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.active !== undefined && { active: data.active }),
        },
      });
      return toDomain(d);
    } catch {
      return null;
    }
  },

  async delete(id, centerId) {
    try {
      await prisma.discipline.delete({ where: { id, centerId } });
      return true;
    } catch {
      return false;
    }
  },
};
