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
  heroEyebrow: z.string().trim().max(100).nullable().optional(),
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
  blogEnabled: z.boolean().optional(),
  blogLabel: z.string().trim().min(1).max(40).optional(),
});
export type UpsertSiteConfigInput = z.infer<typeof upsertSiteConfigSchema>;

export const updateSiteSectionSchema = z.object({
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  visible: z.boolean().optional(),
});
export type UpdateSiteSectionInput = z.infer<typeof updateSiteSectionSchema>;

const hrefSchema = z
  .string()
  .trim()
  .max(500, "Máximo 500 caracteres")
  .refine(
    (v) =>
      v === "" ||
      /^\/(?:#[A-Za-z0-9_-]+|[A-Za-z0-9_\-./?=&%#]*)$/.test(v) ||
      /^https?:\/\//.test(v) ||
      /^mailto:/.test(v) ||
      /^tel:/.test(v),
    "Usa una ruta interna (/#anchor, /ruta), URL https://, mailto: o tel:",
  )
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const createSiteSectionItemSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  href: hrefSchema,
  userId: z.string().nullable().optional(),
});
export type CreateSiteSectionItemInput = z.infer<typeof createSiteSectionItemSchema>;

export const updateSiteSectionItemSchema = createSiteSectionItemSchema;
export type UpdateSiteSectionItemInput = z.infer<typeof updateSiteSectionItemSchema>;

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
