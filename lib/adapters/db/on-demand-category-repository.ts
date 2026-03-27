import type { IOnDemandCategoryRepository } from "@/lib/ports/on-demand-category-repository";
import type { OnDemandCategory, CreateCategoryInput, UpdateCategoryInput, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { prisma } from "./prisma";
import type { OnDemandContentStatus as PrismaOnDemandContentStatus } from "@prisma/client";

function toDomain(r: {
  id: string;
  centerId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  status: PrismaOnDemandContentStatus;
  createdAt: Date;
  updatedAt: Date;
}): OnDemandCategory {
  return {
    id: r.id,
    centerId: r.centerId,
    name: r.name,
    description: r.description,
    thumbnailUrl: r.thumbnailUrl,
    sortOrder: r.sortOrder,
    status: r.status as unknown as OnDemandContentStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const onDemandCategoryRepository: IOnDemandCategoryRepository = {
  async findByCenterId(centerId: string) {
    const list = await prisma.onDemandCategory.findMany({
      where: { centerId },
      orderBy: { sortOrder: "asc" },
    });
    return list.map(toDomain);
  },

  async findPublishedByCenterId(centerId: string) {
    const list = await prisma.onDemandCategory.findMany({
      where: { centerId, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
    });
    return list.map(toDomain);
  },

  async findById(id: string) {
    const r = await prisma.onDemandCategory.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async create(data: CreateCategoryInput) {
    const last = await prisma.onDemandCategory.findFirst({
      where: { centerId: data.centerId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = last ? last.sortOrder + 1 : 0;
    const r = await prisma.onDemandCategory.create({
      data: {
        centerId: data.centerId,
        name: data.name,
        description: data.description ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        sortOrder,
        status: (data.status ?? "DRAFT") as PrismaOnDemandContentStatus,
      },
    });
    return toDomain(r);
  },

  async update(id: string, data: UpdateCategoryInput) {
    const existing = await prisma.onDemandCategory.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.onDemandCategory.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.status != null && { status: data.status as PrismaOnDemandContentStatus }),
      },
    });
    return toDomain(r);
  },

  async delete(id: string) {
    const existing = await prisma.onDemandCategory.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.onDemandCategory.delete({ where: { id } });
    return true;
  },

  async reorder(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.onDemandCategory.update({ where: { id }, data: { sortOrder: index } })
      )
    );
  },
};
