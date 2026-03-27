import type { LessonUnlock, CreateLessonUnlockInput } from "@/lib/domain/on-demand";

export interface ILessonUnlockRepository {
  findByUserId(userId: string): Promise<LessonUnlock[]>;
  findByUserIdAndCenterId(userId: string, centerId: string): Promise<LessonUnlock[]>;
  findByUserAndLesson(userId: string, lessonId: string): Promise<LessonUnlock | null>;
  countByUserPlanAndCategory(userPlanId: string, categoryId: string): Promise<number>;
  create(data: CreateLessonUnlockInput): Promise<LessonUnlock>;
}
