/**
 * Emails transaccionales de autenticación: recuperación de contraseña, verificación de email.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { emailBaseLayout, EMAIL_CTA_STYLE } from "./base-layout";
import { escapeHtml } from "./utils";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

// ─── Recuperar contraseña ─────────────────────────────────────────────────────
export interface ForgotPasswordEmailData {
  toEmail: string;
  userName?: string;
  centerName: string;
  resetUrl: string;
}

export function buildForgotPasswordEmail(data: ForgotPasswordEmailData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Solicitaste recuperar tu contraseña en <strong>${escapeHtml(data.centerName)}</strong>.</p>
    <p><a href="${data.resetUrl}" style="${EMAIL_CTA_STYLE}">Crear nueva contraseña</a></p>
    <p>Este enlace expira en 1 hora.</p>
    <p>Si no solicitaste esto, puedes ignorar este correo.</p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = [
    `${greeting},`,
    `Solicitaste recuperar tu contraseña en ${data.centerName}.`,
    `Crear nueva contraseña: ${data.resetUrl}`,
    "Este enlace expira en 1 hora.",
    "Si no solicitaste esto, puedes ignorar este correo.",
    `— ${data.centerName}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Recupera tu contraseña — ${data.centerName}`,
    html,
    text,
  };
}

// ─── Verificación de email ────────────────────────────────────────────────────
export interface EmailVerificationData {
  toEmail: string;
  userName?: string;
  centerName: string;
  verifyUrl: string;
}

export function buildEmailVerificationEmail(data: EmailVerificationData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Confirma tu email para acceder a todas las funciones de <strong>${escapeHtml(data.centerName)}</strong>.</p>
    <p><a href="${data.verifyUrl}" style="${EMAIL_CTA_STYLE}">Verificar email</a></p>
    <p>Este enlace expira en 24 horas.</p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = [
    `${greeting},`,
    `Confirma tu email para acceder a todas las funciones de ${data.centerName}.`,
    `Verificar email: ${data.verifyUrl}`,
    "Este enlace expira en 24 horas.",
    `— ${data.centerName}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Verifica tu email — ${data.centerName}`,
    html,
    text,
  };
}
