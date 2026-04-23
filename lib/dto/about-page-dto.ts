import { z } from "zod";
import { ABOUT_IMAGE_CATEGORIES } from "@/lib/domain/about-page";

const httpsUrlOrNull = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\//.test(v), "Solo URLs https://")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const hrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      v === "" ||
      /^\/(?:#[A-Za-z0-9_-]+|[A-Za-z0-9_\-./?=&%#]*)$/.test(v) ||
      /^https?:\/\//.test(v) ||
      /^mailto:/.test(v) ||
      /^tel:/.test(v),
    "Usa una ruta interna, URL válida, mailto: o tel:",
  );

export const upsertAboutPageSchema = z.object({
  visible: z.boolean().optional(),
  showInHeader: z.boolean().optional(),
  headerLabel: z.string().min(1).max(50).optional(),
  pageTitle: z.string().min(1).max(120).optional(),
  pageEyebrow: z.string().max(60).nullable().optional(),
  name: z.string().max(120).nullable().optional(),
  tagline: z.string().max(280).nullable().optional(),
  heroImageUrl: httpsUrlOrNull,
  bio: z.string().max(10_000).nullable().optional(),
  propuesta: z.string().max(10_000).nullable().optional(),
  ctaLabel: z.string().min(1).max(80).optional(),
  ctaHref: hrefSchema.optional(),
});
export type UpsertAboutPageInput = z.infer<typeof upsertAboutPageSchema>;

export const createAboutImageSchema = z.object({
  imageUrl: z.string().url().refine((v) => v.startsWith("https://"), "Solo URLs https://"),
  caption: z.string().max(280).nullable().optional(),
  category: z.enum(ABOUT_IMAGE_CATEGORIES),
  visible: z.boolean().optional(),
});
export type CreateAboutImageInput = z.infer<typeof createAboutImageSchema>;

export const updateAboutImageSchema = z.object({
  imageUrl: z.string().url().refine((v) => v.startsWith("https://"), "Solo URLs https://").optional(),
  caption: z.string().max(280).nullable().optional(),
  category: z.enum(ABOUT_IMAGE_CATEGORIES).optional(),
  visible: z.boolean().optional(),
});
export type UpdateAboutImageInput = z.infer<typeof updateAboutImageSchema>;

export const reorderAboutImagesSchema = z.object({
  category: z.enum(ABOUT_IMAGE_CATEGORIES),
  orderedIds: z.array(z.string().min(1)),
});
export type ReorderAboutImagesInput = z.infer<typeof reorderAboutImagesSchema>;
