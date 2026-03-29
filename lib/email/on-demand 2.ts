/**
 * Emails transaccionales para On Demand: lección desbloqueada, cuota agotada, nuevo contenido.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { SITE_NAME } from "@/lib/constants/copy";
import { emailBaseLayout, EMAIL_CTA_STYLE } from "./base-layout";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Lección desbloqueada ────────────────────────────────────────────────────
export interface LessonUnlockedEmailData {
  toEmail: string;
  userName?: string;
  lessonTitle: string;
  practiceName: string;
  categoryName: string;
  remainingLessons: number | null;
  onDemandUrl: string;
  preferencesUrl?: string;
}

export function buildLessonUnlockedEmail(data: LessonUnlockedEmailData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const remainingLine =
    data.remainingLessons !== null
      ? `<p>Te quedan <strong>${data.remainingLessons}</strong> clases de ${escapeHtml(data.categoryName)}.</p>`
      : "";
  const body = `
    <p>${greeting},</p>
    <p>Desbloqueaste <strong>${escapeHtml(data.lessonTitle)}</strong> de ${escapeHtml(data.practiceName)}.</p>
    ${remainingLine}
    <p><a href="${data.onDemandUrl}" style="${EMAIL_CTA_STYLE}">Ver clase</a></p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME, preferencesUrl: data.preferencesUrl });
  const remainingText =
    data.remainingLessons !== null
      ? `Te quedan ${data.remainingLessons} clases de ${data.categoryName}.`
      : "";
  const text = [
    `${greeting},`,
    `Desbloqueaste ${data.lessonTitle} de ${data.practiceName}.`,
    remainingText,
    `Ver clase: ${data.onDemandUrl}`,
    `— ${SITE_NAME}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Desbloqueaste: ${data.lessonTitle}`,
    html,
    text,
  };
}

// ─── Cuota agotada ───────────────────────────────────────────────────────────
export interface QuotaExhaustedEmailData {
  toEmail: string;
  userName?: string;
  categoryName: string;
  storeUrl: string;
  preferencesUrl?: string;
}

export function buildQuotaExhaustedEmail(data: QuotaExhaustedEmailData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Usaste todas tus clases de <strong>${escapeHtml(data.categoryName)}</strong>.</p>
    <p>Renueva tu plan o compra una membresía para acceso ilimitado.</p>
    <p><a href="${data.storeUrl}" style="${EMAIL_CTA_STYLE}">Ver planes</a></p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME, preferencesUrl: data.preferencesUrl });
  const text = [
    `${greeting},`,
    `Usaste todas tus clases de ${data.categoryName}.`,
    "Renueva tu plan o compra una membresía para acceso ilimitado.",
    `Ver planes: ${data.storeUrl}`,
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Usaste todas tus clases de ${data.categoryName}`,
    html,
    text,
  };
}

// ─── Nuevo contenido ─────────────────────────────────────────────────────────
export interface NewContentEmailData {
  toEmail: string;
  userName?: string;
  lessonTitle: string;
  practiceName: string;
  catalogUrl: string;
  preferencesUrl?: string;
}

export function buildNewContentEmail(data: NewContentEmailData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Se agregó <strong>${escapeHtml(data.lessonTitle)}</strong> a ${escapeHtml(data.practiceName)}.</p>
    <p>Explora el catálogo on demand.</p>
    <p><a href="${data.catalogUrl}" style="${EMAIL_CTA_STYLE}">Ver catálogo</a></p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME, preferencesUrl: data.preferencesUrl });
  const text = [
    `${greeting},`,
    `Se agregó ${data.lessonTitle} a ${data.practiceName}.`,
    "Explora el catálogo on demand.",
    `Ver catálogo: ${data.catalogUrl}`,
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Nueva clase disponible: ${data.lessonTitle}`,
    html,
    text,
  };
}
