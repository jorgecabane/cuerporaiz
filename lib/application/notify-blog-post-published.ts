/**
 * Notifica a los estudiantes del centro cuando se publica una nueva entrada del
 * blog (gatillado por el webhook de Sanity). Respeta el switch `blogPublished`
 * del perfil y dedup por `postId` para no reenviar al editar un post ya notificado.
 */

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { centerRepository, prisma } from "@/lib/adapters/db";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildBlogPostPublishedEmail } from "@/lib/email/blog";
import { getEmailBranding } from "@/lib/email/branding";
import { urlForImage } from "@/lib/sanity/image";
import { getBaseUrl } from "@/lib/utils/base-url";

/** Payload plano que envía el webhook de Sanity (ver projection en la ruta). */
export const blogPostWebhookSchema = z.object({
  _id: z.string().min(1),
  _type: z.string(),
  slug: z.string().min(1).nullish(),
  title: z.string().min(1),
  excerpt: z.string().default(""),
  coverImage: z.unknown().nullish(),
  readingMinutes: z.number().nullish(),
  categoryName: z.string().nullish(),
  authorName: z.string().nullish(),
  publishedAt: z.string().nullish(),
});

export type BlogPostWebhookPayload = z.infer<typeof blogPostWebhookSchema>;

export type NotifyBlogResult =
  | { status: "ignored"; reason: string }
  | { status: "skipped"; reason: string }
  | { status: "sent"; notified: number };

export async function notifyBlogPostPublishedUseCase(
  payload: BlogPostWebhookPayload
): Promise<NotifyBlogResult> {
  // Guards: solo posts publicados con slug.
  if (payload._type !== "post") return { status: "ignored", reason: "not_a_post" };
  if (!payload.slug) return { status: "ignored", reason: "no_slug" };
  if (!payload.publishedAt || new Date(payload.publishedAt) > new Date()) {
    return { status: "ignored", reason: "not_published" };
  }

  // El blog es single-dataset: la audiencia es el centro público por defecto.
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;
  if (!center) return { status: "ignored", reason: "no_center" };

  // Dedup atómico: crear ANTES de enviar. Si el post ya fue notificado, la
  // restricción única (postId) lanza P2002 y salimos sin reenviar.
  try {
    await prisma.blogPostNotification.create({
      data: { postId: payload._id, centerId: center.id },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "skipped", reason: "already_notified" };
    }
    throw err;
  }

  const branding = await getEmailBranding(center.id);
  const baseUrl = getBaseUrl();
  const postUrl = `${baseUrl}/blog/${payload.slug}`;
  const preferencesUrl = `${baseUrl}/panel/mi-perfil?tab=correos`;
  const coverImageUrl = urlForImage(payload.coverImage ?? undefined);

  const roles = await prisma.userCenterRole.findMany({
    where: { centerId: center.id, role: "STUDENT" },
    include: {
      user: { include: { emailPreferences: { where: { centerId: center.id } } } },
    },
  });

  let notified = 0;
  const seen = new Set<string>();
  for (const { user } of roles) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    if (!user.email) continue;
    const wantsBlog = user.emailPreferences[0]?.blogPublished ?? true;
    if (!wantsBlog) continue;

    sendEmailSafe(
      buildBlogPostPublishedEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        postTitle: payload.title,
        excerpt: payload.excerpt,
        coverImageUrl,
        categoryName: payload.categoryName ?? undefined,
        readingMinutes: payload.readingMinutes ?? undefined,
        authorName: payload.authorName ?? undefined,
        postUrl,
        preferencesUrl,
        branding,
      })
    );
    notified++;
  }

  return { status: "sent", notified };
}
