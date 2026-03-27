import { z } from "zod";

export const unlockLessonSchema = z.object({
  lessonId: z.string().min(1),
});
export type UnlockLessonBody = z.infer<typeof unlockLessonSchema>;
