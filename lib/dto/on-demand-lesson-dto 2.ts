import { z } from "zod";

const httpsUrl = z.string().url().startsWith("https://");

export const createLessonSchema = z.object({
  practiceId: z.string().min(1),
  title: z.string().min(1),
  videoUrl: httpsUrl,
  description: z.string().optional(),
  promoVideoUrl: httpsUrl.optional(),
  thumbnailUrl: httpsUrl.optional(),
  durationMinutes: z.number().int().min(1).optional(),
  level: z.string().optional(),
  intensity: z.string().optional(),
  targetAudience: z.string().optional(),
  equipment: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type CreateLessonBody = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  videoUrl: httpsUrl.optional(),
  description: z.string().nullable().optional(),
  promoVideoUrl: httpsUrl.nullable().optional(),
  thumbnailUrl: httpsUrl.nullable().optional(),
  durationMinutes: z.number().int().min(1).nullable().optional(),
  level: z.string().nullable().optional(),
  intensity: z.string().nullable().optional(),
  targetAudience: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type UpdateLessonBody = z.infer<typeof updateLessonSchema>;
