/**
 * On Demand content hierarchy: Category → Practice → Lesson.
 * Unlock system: students unlock lessons using plan quotas.
 */

export type OnDemandContentStatus = "DRAFT" | "PUBLISHED";

export interface OnDemandCategory {
  id: string;
  centerId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  status: OnDemandContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnDemandPractice {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  status: OnDemandContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnDemandLesson {
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
  status: OnDemandContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanCategoryQuota {
  id: string;
  planId: string;
  categoryId: string;
  maxLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonUnlock {
  id: string;
  userId: string;
  lessonId: string;
  userPlanId: string;
  centerId: string;
  unlockedAt: Date;
}

export interface CreateCategoryInput {
  centerId: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status?: OnDemandContentStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status?: OnDemandContentStatus;
}

export interface CreatePracticeInput {
  categoryId: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status?: OnDemandContentStatus;
}

export interface UpdatePracticeInput {
  name?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status?: OnDemandContentStatus;
}

export interface CreateLessonInput {
  practiceId: string;
  title: string;
  videoUrl: string;
  description?: string | null;
  promoVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationMinutes?: number | null;
  level?: string | null;
  intensity?: string | null;
  targetAudience?: string | null;
  equipment?: string | null;
  tags?: string | null;
  status?: OnDemandContentStatus;
}

export interface UpdateLessonInput {
  title?: string;
  videoUrl?: string;
  description?: string | null;
  promoVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationMinutes?: number | null;
  level?: string | null;
  intensity?: string | null;
  targetAudience?: string | null;
  equipment?: string | null;
  tags?: string | null;
  status?: OnDemandContentStatus;
}

export interface CreateLessonUnlockInput {
  userId: string;
  lessonId: string;
  userPlanId: string;
  centerId: string;
}

export const CONTENT_STATUS_LABELS: Record<OnDemandContentStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
};
