import { z } from "zod";

const httpsUrl = z.string().url().startsWith("https://");

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: httpsUrl.optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type CreateCategoryBody = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  thumbnailUrl: httpsUrl.nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
