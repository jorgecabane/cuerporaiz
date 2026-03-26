import type { ILessonUnlockRepository } from "@/lib/ports/lesson-unlock-repository";
import type { LessonUnlock, CreateLessonUnlockInput } from "@/lib/domain/on-demand";
import { prisma } from "./prisma";

function toDomain(r: {
  id: string;
  userId: string;
  lessonId: string;
  userPlanId: string;
  centerId: string;
  unlockedAt: Date;
}): LessonUnlock {
  return {
    id: r.id,
    userId: r.userId,
    lessonId: r.lessonId,
    userPlanId: r.userPlanId,
    centerId: r.centerId,
    unlockedAt: r.unlockedAt,
  };
}

export const lessonUnlockRepository: ILessonUnlockRepository = {
  async findByUserId(userId: string) {
    const list = await prisma.lessonUnlock.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
    return list.map(toDomain);
  },

  async findByUserAndLesson(userId: string, lessonId: string) {
    const r = await prisma.lessonUnlock.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return r ? toDomain(r) : null;
  },

  async countByUserPlanAndCategory(userPlanId: string, categoryId: string) {
    return prisma.lessonUnlock.count({
      where: {
        userPlanId,
        lesson: { practice: { categoryId } },
      },
    });
  },

  async create(data: CreateLessonUnlockInput) {
    const r = await prisma.lessonUnlock.create({
      data: {
        userId: data.userId,
        lessonId: data.lessonId,
        userPlanId: data.userPlanId,
        centerId: data.centerId,
      },
    });
    return toDomain(r);
  },
};
