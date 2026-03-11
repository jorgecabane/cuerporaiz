import type { ICenterRepository } from "@/lib/ports";
import type { Center } from "@/lib/domain";
import { prisma } from "./prisma";

function toDomainCenter(c: {
  id: string;
  name: string;
  slug: string;
  cancelBeforeHours: number;
  maxNoShowsPerMonth: number;
  createdAt: Date;
  updatedAt: Date;
}): Center {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    cancelBeforeHours: c.cancelBeforeHours,
    maxNoShowsPerMonth: c.maxNoShowsPerMonth,
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
};
