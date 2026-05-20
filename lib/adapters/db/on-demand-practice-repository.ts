import type { IOnDemandPracticeRepository } from "@/lib/ports/on-demand-practice-repository";
import type { OnDemandPractice, OnDemandContentStatus, CreatePracticeInput, UpdatePracticeInput } from "@/lib/domain/on-demand";
import { prisma } from "./prisma";
import type { OnDemandContentStatus as PrismaOnDemandContentStatus } from "@prisma/client";

function toDomain(r: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  status: PrismaOnDemandContentStatus;
  createdAt: Date;
  updatedAt: Date;
}): OnDemandPractice {
  return {
    id: r.id,
    categoryId: r.categoryId,
    name: r.name,
    description: r.description,
    thumbnailUrl: r.thumbnailUrl,
    sortOrder: r.sortOrder,
    status: r.status as unknown as OnDemandContentStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const onDemandPracticeRepository: IOnDemandPracticeRepository = {
  async findByCategoryId(categoryId: string) {
    const list = await prisma.onDemandPractice.findMany({
      where: { categoryId },
      orderBy: { sortOrder: "asc" },
    });
    return list.map(toDomain);
  },

  async findPublishedByCategoryId(categoryId: string) {
    const list = await prisma.onDemandPractice.findMany({
      where: { categoryId, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
    });
    return list.map(toDomain);
  },

  async findPublishedWithLessonsByCategoryId(categoryId: string) {
    const list = await prisma.onDemandPractice.findMany({
      where: { categoryId, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      include: {
        lessons: {
          where: { status: "PUBLISHED" },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    return list.map((p) => ({
      ...toDomain(p),
      lessons: p.lessons.map((l) => ({
        id: l.id,
        practiceId: l.practiceId,
        title: l.title,
        description: l.description,
        videoUrl: l.videoUrl,
        promoVideoUrl: l.promoVideoUrl,
        thumbnailUrl: l.thumbnailUrl,
        durationMinutes: l.durationMinutes,
        level: l.level,
        intensity: l.intensity,
        targetAudience: l.targetAudience,
        equipment: l.equipment,
        tags: l.tags,
        sortOrder: l.sortOrder,
        status: l.status as unknown as OnDemandContentStatus,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
    }));
  },

  async findById(id: string) {
    const r = await prisma.onDemandPractice.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async create(centerId: string, data: CreatePracticeInput) {
    // Verifica que la categoría pertenezca al centro antes de crear la práctica.
    const category = await prisma.onDemandCategory.findFirst({
      where: { id: data.categoryId, centerId },
      select: { id: true },
    });
    if (!category) return null;

    const last = await prisma.onDemandPractice.findFirst({
      where: { categoryId: data.categoryId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = last ? last.sortOrder + 1 : 0;
    const r = await prisma.onDemandPractice.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        sortOrder,
        status: (data.status ?? "DRAFT") as PrismaOnDemandContentStatus,
      },
    });
    return toDomain(r);
  },

  async update(id: string, centerId: string, data: UpdatePracticeInput) {
    const result = await prisma.onDemandPractice.updateMany({
      where: { id, category: { centerId } },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.status != null && { status: data.status as PrismaOnDemandContentStatus }),
      },
    });
    if (result.count === 0) return null;
    const r = await prisma.onDemandPractice.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async delete(id: string, centerId: string) {
    const result = await prisma.onDemandPractice.deleteMany({
      where: { id, category: { centerId } },
    });
    return result.count > 0;
  },

  async reorder(centerId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.onDemandPractice.updateMany({
          where: { id, category: { centerId } },
          data: { sortOrder: index },
        })
      )
    );
  },
};
