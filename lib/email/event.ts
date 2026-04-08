/**
 * Emails transaccionales para Eventos: confirmación de entrada.
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amountCents: number, currency: string): string {
  if (amountCents === 0) return "Gratis";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(amountCents);
}

export interface EventTicketConfirmationEmailData {
  toEmail: string;
  userName?: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  amountCents: number;
  currency: string;
  eventUrl?: string;
  preferencesUrl?: string;
}

export function buildEventTicketConfirmationEmail(
  data: EventTicketConfirmationEmailData
): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const locationLine = data.location
    ? `<p><strong>Lugar:</strong> ${escapeHtml(data.location)}</p>`
    : "";
  const amountLine = `<p><strong>Valor pagado:</strong> ${escapeHtml(formatAmount(data.amountCents, data.currency))}</p>`;
  const ctaLine = data.eventUrl
    ? `<p><a href="${data.eventUrl}" style="${EMAIL_CTA_STYLE}">Ver detalles del evento</a></p>`
    : "";

  const body = `
    <p>${greeting},</p>
    <p>Tu entrada para <strong>${escapeHtml(data.eventTitle)}</strong> está confirmada.</p>
    <p><strong>Fecha:</strong> ${escapeHtml(formatDate(data.startsAt))}</p>
    ${locationLine}
    ${amountLine}
    ${ctaLine}`;

  const html = emailBaseLayout({ body, centerName: SITE_NAME, preferencesUrl: data.preferencesUrl });

  const textLines = [
    `${greeting},`,
    `Tu entrada para ${data.eventTitle} está confirmada.`,
    `Fecha: ${formatDate(data.startsAt)}`,
    data.location ? `Lugar: ${data.location}` : "",
    `Valor pagado: ${formatAmount(data.amountCents, data.currency)}`,
    data.eventUrl ? `Ver detalles: ${data.eventUrl}` : "",
    `— ${SITE_NAME}`,
  ].filter(Boolean).join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Confirmación: ${data.eventTitle}`,
    html,
    text: textLines,
  };
}
