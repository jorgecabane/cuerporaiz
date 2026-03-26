import type { IOnDemandLessonRepository } from "@/lib/ports/on-demand-lesson-repository";
import type { OnDemandLesson, CreateLessonInput, UpdateLessonInput, OnDemandContentStatus } from "@/lib/domain/on-demand";
import { prisma } from "./prisma";
import type { OnDemandContentStatus as PrismaOnDemandContentStatus } from "@prisma/client";

function toDomain(r: {
  id: string;
  practiceId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  promoVideoUrl: string | null;
  thumbnailUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
  intensity: string | null;
  targetAudience: string | null;
  equipment: string | null;
  tags: string | null;
  sortOrder: number;
  status: PrismaOnDemandContentStatus;
  createdAt: Date;
  updatedAt: Date;
}): OnDemandLesson {
  return {
    id: r.id,
    practiceId: r.practiceId,
    title: r.title,
    description: r.description,
    videoUrl: r.videoUrl,
    promoVideoUrl: r.promoVideoUrl,
    thumbnailUrl: r.thumbnailUrl,
    durationMinutes: r.durationMinutes,
    level: r.level,
    intensity: r.intensity,
    targetAudience: r.targetAudience,
    equipment: r.equipment,
    tags: r.tags,
    sortOrder: r.sortOrder,
    status: r.status as unknown as OnDemandContentStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const onDemandLessonRepository: IOnDemandLessonRepository = {
  async findByPracticeId(practiceId: string) {
    const list = await prisma.onDemandLesson.findMany({
      where: { practiceId },
      orderBy: { sortOrder: "asc" },
    });
    return list.map(toDomain);
  },

  async findPublishedByPracticeId(practiceId: string) {
    const list = await prisma.onDemandLesson.findMany({
      where: { practiceId, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
    });
    return list.map(toDomain);
  },

  async findById(id: string) {
    const r = await prisma.onDemandLesson.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async create(data: CreateLessonInput) {
    const last = await prisma.onDemandLesson.findFirst({
      where: { practiceId: data.practiceId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = last ? last.sortOrder + 1 : 0;
    const r = await prisma.onDemandLesson.create({
      data: {
        practiceId: data.practiceId,
        title: data.title,
        videoUrl: data.videoUrl,
        description: data.description ?? null,
        promoVideoUrl: data.promoVideoUrl ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        durationMinutes: data.durationMinutes ?? null,
        level: data.level ?? null,
        intensity: data.intensity ?? null,
        targetAudience: data.targetAudience ?? null,
        equipment: data.equipment ?? null,
        tags: data.tags ?? null,
        sortOrder,
        status: (data.status ?? "DRAFT") as PrismaOnDemandContentStatus,
      },
    });
    return toDomain(r);
  },

  async update(id: string, data: UpdateLessonInput) {
    const existing = await prisma.onDemandLesson.findUnique({ where: { id } });
    if (!existing) return null;
    const r = await prisma.onDemandLesson.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.videoUrl != null && { videoUrl: data.videoUrl }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.promoVideoUrl !== undefined && { promoVideoUrl: data.promoVideoUrl }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.intensity !== undefined && { intensity: data.intensity }),
        ...(data.targetAudience !== undefined && { targetAudience: data.targetAudience }),
        ...(data.equipment !== undefined && { equipment: data.equipment }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.status != null && { status: data.status as PrismaOnDemandContentStatus }),
      },
    });
    return toDomain(r);
  },

  async delete(id: string) {
    const existing = await prisma.onDemandLesson.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.onDemandLesson.delete({ where: { id } });
    return true;
  },

  async reorder(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.onDemandLesson.update({ where: { id }, data: { sortOrder: index } })
      )
    );
  },
};
