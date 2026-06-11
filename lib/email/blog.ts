/**
 * Email transaccional: nueva entrada del blog publicada.
 * Diseño "hero card": imagen de portada arriba, categoría/tiempo de lectura,
 * título, extracto, autor y CTA para seguir leyendo.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { escapeHtml } from "./utils";
import type { EmailBranding } from "./branding";

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
}

export interface BlogPostPublishedEmailData {
  toEmail: string;
  userName?: string;
  postTitle: string;
  excerpt: string;
  /** URL absoluta de la portada (Sanity CDN). Si falta, se omite la imagen. */
  coverImageUrl?: string | null;
  categoryName?: string | null;
  readingMinutes?: number | null;
  authorName?: string | null;
  /** URL pública del artículo: {baseUrl}/blog/{slug}. */
  postUrl: string;
  preferencesUrl?: string;
  branding: EmailBranding;
}

export function buildBlogPostPublishedEmail(
  data: BlogPostPublishedEmailData
): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);

  const coverBlock = data.coverImageUrl
    ? `<img src="${escapeHtml(data.coverImageUrl)}" alt="" width="536" style="width:100%;max-width:536px;height:auto;display:block;border:0;border-radius:10px;margin:0 0 20px;">`
    : "";

  const metaParts: string[] = [];
  if (data.categoryName) metaParts.push(escapeHtml(data.categoryName).toUpperCase());
  if (data.readingMinutes) metaParts.push(`${data.readingMinutes} min de lectura`);
  const metaBlock = metaParts.length
    ? `<p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.04em;color:${branding.colorSecondary};text-transform:uppercase;">${metaParts.join(" &middot; ")}</p>`
    : "";

  const authorBlock = data.authorName
    ? `<p style="margin:0 0 4px;font-size:13px;color:#5C5A56;">por ${escapeHtml(data.authorName)}</p>`
    : "";

  const body = `
    <p style="margin:0 0 20px;">${greeting}, hay una nueva entrada en el blog 🌿</p>
    ${coverBlock}
    ${metaBlock}
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:${branding.colorPrimary};">${escapeHtml(data.postTitle)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#2A2A2A;">${escapeHtml(data.excerpt)}</p>
    ${authorBlock}
    <p style="text-align:center;margin:28px 0 4px;"><a href="${data.postUrl}" style="${cta}">Seguir leyendo →</a></p>`;

  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });

  const text = [
    `${data.userName ? `Hola ${data.userName}` : "Hola"}, hay una nueva entrada en el blog.`,
    "",
    data.postTitle,
    data.excerpt,
    data.authorName ? `por ${data.authorName}` : "",
    "",
    `Seguir leyendo: ${data.postUrl}`,
    `— ${branding.centerName}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Nueva entrada en el blog: ${data.postTitle}`,
    html,
    text,
  };
}
