import { z } from "zod";

export const quotaItemSchema = z.object({
  categoryId: z.string().min(1),
  maxLessons: z.number().int().min(1),
});

export const upsertQuotasSchema = z.object({
  quotas: z.array(quotaItemSchema),
});
export type UpsertQuotasBody = z.infer<typeof upsertQuotasSchema>;
