/**
 * Emails transaccionales de autenticación: recuperación de contraseña, verificación de email.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { escapeHtml } from "./utils";
import type { EmailBranding } from "./branding";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
}

// ─── Recuperar contraseña ─────────────────────────────────────────────────────
export interface ForgotPasswordEmailData {
  toEmail: string;
  userName?: string;
  resetUrl: string;
  branding: EmailBranding;
}

export function buildForgotPasswordEmail(data: ForgotPasswordEmailData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Solicitaste recuperar tu contraseña en <strong>${escapeHtml(branding.centerName)}</strong>.</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.resetUrl}" style="${cta}">Crear nueva contraseña</a></p>
    <p style="font-size:12px;color:#5C5A56;">¿No funciona el botón? Copia y pega este link en tu navegador:</p>
    <p style="font-size:12px;word-break:break-all;background:#F5F0E9;padding:10px;border-radius:6px;color:#2A2A2A;">${data.resetUrl}</p>
    <p style="font-size:13px;color:#5C5A56;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora el correo.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Solicitaste recuperar tu contraseña en ${branding.centerName}.`,
    `Crear nueva contraseña: ${data.resetUrl}`,
    "Este enlace expira en 1 hora.",
    "Si no solicitaste esto, puedes ignorar este correo.",
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Recupera tu contraseña — ${branding.centerName}`,
    html,
    text,
  };
}

// ─── Verificación de email ────────────────────────────────────────────────────
export interface EmailVerificationData {
  toEmail: string;
  userName?: string;
  verifyUrl: string;
  branding: EmailBranding;
}

export function buildEmailVerificationEmail(data: EmailVerificationData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Confirma tu email para acceder a todas las funciones de <strong>${escapeHtml(branding.centerName)}</strong>.</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.verifyUrl}" style="${cta}">Verificar email</a></p>
    <p style="font-size:12px;color:#5C5A56;">¿No funciona el botón? Copia y pega este link en tu navegador:</p>
    <p style="font-size:12px;word-break:break-all;background:#F5F0E9;padding:10px;border-radius:6px;color:#2A2A2A;">${data.verifyUrl}</p>
    <p style="font-size:13px;color:#5C5A56;">Este enlace expira en 24 horas.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Confirma tu email para acceder a todas las funciones de ${branding.centerName}.`,
    `Verificar email: ${data.verifyUrl}`,
    "Este enlace expira en 24 horas.",
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Verifica tu email — ${branding.centerName}`,
    html,
    text,
  };
}

// ─── Set password (invitación admin → estudiante / profesor) ─────────────────
export interface SetPasswordEmailData {
  toEmail: string;
  userName?: string;
  setPasswordUrl: string;
  /** Etiqueta del rol para personalizar el copy ("estudiante" / "profesor/a" / "administración"). */
  roleLabel?: string;
  branding: EmailBranding;
}

export function buildSetPasswordEmail(data: SetPasswordEmailData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const roleLine = data.roleLabel
    ? `Fuiste agregado/a como <strong>${escapeHtml(data.roleLabel)}</strong>.`
    : "El equipo te creó una cuenta.";
  const body = `
    <p>${greeting},</p>
    <p>Te damos la bienvenida a <strong>${escapeHtml(branding.centerName)}</strong>. ${roleLine}</p>
    <p>Para entrar al panel, define tu contraseña:</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.setPasswordUrl}" style="${cta}">Crear mi contraseña</a></p>
    <p style="font-size:12px;color:#5C5A56;">¿No funciona el botón? Copia y pega este link en tu navegador:</p>
    <p style="font-size:12px;word-break:break-all;background:#F5F0E9;padding:10px;border-radius:6px;color:#2A2A2A;">${data.setPasswordUrl}</p>
    <p style="font-size:13px;color:#5C5A56;">Este enlace expira en 7 días.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Bienvenida/o a ${branding.centerName}. ${data.roleLabel ? `Fuiste agregado/a como ${data.roleLabel}.` : "El equipo te creó una cuenta."}`,
    `Crear contraseña: ${data.setPasswordUrl}`,
    "Este enlace expira en 7 días.",
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Activa tu cuenta — ${branding.centerName}`,
    html,
    text,
  };
}

export { DEFAULT_FROM };
