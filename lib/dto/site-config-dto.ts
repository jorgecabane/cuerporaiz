import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color hex inválido")
  .nullable()
  .optional();

const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith("https://"), "Solo URLs https://")
  .nullable()
  .optional();

export const upsertSiteConfigSchema = z.object({
  heroTitle: z.string().nullable().optional(),
  heroSubtitle: z.string().nullable().optional(),
  heroImageUrl: httpsUrlSchema,
  logoUrl: httpsUrlSchema,
  colorPrimary: hexColorSchema,
  colorSecondary: hexColorSchema,
  colorAccent: hexColorSchema,
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactAddress: z.string().nullable().optional(),
  instagramUrl: httpsUrlSchema,
  facebookUrl: httpsUrlSchema,
  whatsappUrl: httpsUrlSchema,
  youtubeUrl: httpsUrlSchema,
});
export type UpsertSiteConfigInput = z.infer<typeof upsertSiteConfigSchema>;

export const updateSiteSectionSchema = z.object({
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  visible: z.boolean().optional(),
});
export type UpdateSiteSectionInput = z.infer<typeof updateSiteSectionSchema>;

export const createSiteSectionItemSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: httpsUrlSchema,
  linkUrl: httpsUrlSchema,
  userId: z.string().nullable().optional(),
});
export type CreateSiteSectionItemInput = z.infer<typeof createSiteSectionItemSchema>;

export const updateSiteSectionItemSchema = createSiteSectionItemSchema;
export type UpdateSiteSectionItemInput = z.infer<typeof updateSiteSectionItemSchema>;

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
