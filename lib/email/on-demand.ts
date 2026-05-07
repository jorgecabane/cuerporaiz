/**
 * Emails transaccionales para On Demand: lección desbloqueada, cuota agotada, nuevo contenido.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { escapeHtml } from "./utils";
import type { EmailBranding } from "./branding";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
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
  branding: EmailBranding;
}

export function buildLessonUnlockedEmail(data: LessonUnlockedEmailData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const remainingLine =
    data.remainingLessons !== null
      ? `<p style="font-size:13px;color:#5C5A56;">Te quedan <strong style="color:${branding.colorPrimary};">${data.remainingLessons}</strong> clases de ${escapeHtml(data.categoryName)}.</p>`
      : "";
  const body = `
    <p>${greeting},</p>
    <p>Desbloqueaste <strong>${escapeHtml(data.lessonTitle)}</strong> de ${escapeHtml(data.practiceName)}.</p>
    ${remainingLine}
    <p style="text-align:center;margin:28px 0;"><a href="${data.onDemandUrl}" style="${cta}">Ver clase</a></p>`;
  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });
  const remainingText =
    data.remainingLessons !== null
      ? `Te quedan ${data.remainingLessons} clases de ${data.categoryName}.`
      : "";
  const text = [
    `${greeting},`,
    `Desbloqueaste ${data.lessonTitle} de ${data.practiceName}.`,
    remainingText,
    `Ver clase: ${data.onDemandUrl}`,
    `— ${branding.centerName}`,
  ].filter(Boolean).join("\n");

  return {
    from: fromForBranding(branding),
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
  branding: EmailBranding;
}

export function buildQuotaExhaustedEmail(data: QuotaExhaustedEmailData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Usaste todas tus clases de <strong>${escapeHtml(data.categoryName)}</strong>.</p>
    <p>Renová tu plan o suma una membresía para acceso ilimitado.</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.storeUrl}" style="${cta}">Ver planes</a></p>`;
  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });
  const text = [
    `${greeting},`,
    `Usaste todas tus clases de ${data.categoryName}.`,
    "Renová tu plan o suma una membresía para acceso ilimitado.",
    `Ver planes: ${data.storeUrl}`,
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
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
  branding: EmailBranding;
}

export function buildNewContentEmail(data: NewContentEmailData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Se agregó <strong>${escapeHtml(data.lessonTitle)}</strong> a ${escapeHtml(data.practiceName)}.</p>
    <p>Pasate por la biblioteca virtual a explorarla.</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.catalogUrl}" style="${cta}">Ver catálogo</a></p>`;
  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });
  const text = [
    `${greeting},`,
    `Se agregó ${data.lessonTitle} a ${data.practiceName}.`,
    `Ver catálogo: ${data.catalogUrl}`,
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Nueva clase disponible: ${data.lessonTitle}`,
    html,
    text,
  };
}

export { DEFAULT_FROM };
