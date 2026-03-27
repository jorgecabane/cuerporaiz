import { z } from "zod";

const httpsUrl = z.string().url().startsWith("https://");

export const createPracticeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: httpsUrl.optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type CreatePracticeBody = z.infer<typeof createPracticeSchema>;

export const updatePracticeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  thumbnailUrl: httpsUrl.nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type UpdatePracticeBody = z.infer<typeof updatePracticeSchema>;
