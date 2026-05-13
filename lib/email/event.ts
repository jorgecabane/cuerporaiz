/**
 * Emails transaccionales para Eventos: confirmación de entrada.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { escapeHtml } from "./utils";
import { formatLongDateTime } from "./format-datetime";
import type { EmailBranding } from "./branding";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
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
  quantity?: number;
  eventUrl?: string;
  preferencesUrl?: string;
  branding: EmailBranding;
}

export function buildEventTicketConfirmationEmail(
  data: EventTicketConfirmationEmailData
): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const when = formatLongDateTime(data.startsAt, branding.timezone);
  const cta = emailCtaStyle(branding.colorSecondary);
  const quantity = data.quantity && data.quantity > 0 ? data.quantity : 1;

  const locationLine = data.location
    ? `<p style="margin:4px 0 0;font-size:14px;color:#5C5A56;">${escapeHtml(data.location)}</p>`
    : "";
  const quantityLine =
    quantity > 1
      ? `<p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">Compraste <strong style="color:#2A2A2A;">${quantity}</strong> cupos.</p>`
      : "";
  const ctaLine = data.eventUrl
    ? `<p style="text-align:center;margin:24px 0;"><a href="${data.eventUrl}" style="${cta}">Ver detalles del evento</a></p>`
    : "";

  const intro =
    quantity > 1
      ? `<p>Tu reserva de <strong>${quantity} cupos</strong> para <strong>${escapeHtml(data.eventTitle)}</strong> está confirmada. ¡Los esperamos!</p>`
      : `<p>Tu entrada para <strong>${escapeHtml(data.eventTitle)}</strong> está confirmada. ¡Te esperamos!</p>`;

  const body = `
    <p>${greeting},</p>
    ${intro}
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${escapeHtml(data.eventTitle)}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">${escapeHtml(when)}</p>
        ${locationLine}
        ${quantityLine}
        <p style="margin:8px 0 0;font-size:13px;color:#8A8782;">Pagaste <strong style="color:#2A2A2A;">${escapeHtml(formatAmount(data.amountCents, data.currency))}</strong></p>
      </td></tr>
    </table>
    ${ctaLine}`;

  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });

  const textLines = [
    `${greeting},`,
    quantity > 1
      ? `Tu reserva de ${quantity} cupos para ${data.eventTitle} está confirmada.`
      : `Tu entrada para ${data.eventTitle} está confirmada.`,
    `Fecha: ${when}`,
    data.location ? `Lugar: ${data.location}` : "",
    `Valor pagado: ${formatAmount(data.amountCents, data.currency)}`,
    data.eventUrl ? `Ver detalles: ${data.eventUrl}` : "",
    `— ${branding.centerName}`,
  ].filter(Boolean).join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Confirmación: ${data.eventTitle}`,
    html,
    text: textLines,
  };
}

export { DEFAULT_FROM };
