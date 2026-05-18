/**
 * Emails transaccionales para waitlist (lista de espera) — clases y eventos.
 *
 * - buildSpotFreedEmail: aviso "se liberó un cupo" (broadcast a la cola).
 *   Polimórfico vía itemKind: usa copy de "clase" o "evento" según corresponda.
 *
 * - buildWaitlistClassCancelledEmail: aviso a quienes estaban en la waitlist
 *   cuando admin cancela la clase entera.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { buildGoogleCalendarUrl } from "@/lib/email/calendar";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { escapeHtml } from "./utils";
import { formatLongDateTime } from "./format-datetime";
import type { EmailBranding } from "./branding";

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
}

// ─── Aviso "se liberó un cupo" (clase o evento) ─────────────────────────────
export interface SpotFreedData {
  toEmail: string;
  userName?: string;
  itemKind: "class" | "event";
  itemName: string;
  startAt: string; // ISO
  endAt?: string; // opcional para eventos largos
  location: string;
  bookUrl: string;
  ctaLabel: string; // "Reservar ahora" | "Ir al pago"
  branding: EmailBranding;
}

export function buildSpotFreedEmail(data: SpotFreedData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const when = formatLongDateTime(data.startAt, branding.timezone);
  const cta = emailCtaStyle(branding.colorSecondary);
  const itemLabel = data.itemKind === "class" ? "la clase" : "el evento";
  const safeName = escapeHtml(data.itemName);
  const safeLocation = escapeHtml(data.location);
  const safeCta = escapeHtml(data.ctaLabel);

  const calendarLink =
    data.endAt !== undefined
      ? `<p style="text-align:center;font-size:13px;"><a href="${buildGoogleCalendarUrl(
          {
            title: data.itemName,
            start: data.startAt,
            end: data.endAt,
            location: data.location,
            details: `Reservar: ${data.bookUrl}`,
            timeZone: branding.timezone,
          }
        )}" style="color:${branding.colorPrimary};">Añadir a Google Calendar</a></p>`
      : "";

  const body = `
    <p>${greeting},</p>
    <p>Se liberó un cupo en ${itemLabel} que tenías en lista de espera:</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${safeName}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">${escapeHtml(when)}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#5C5A56;">${safeLocation}</p>
      </td></tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;color:#8A8782;">Otros estudiantes también recibieron este aviso. El primero que confirme se queda con el cupo.</p>
    <p style="text-align:center;margin:24px 0;"><a href="${data.bookUrl}" style="${cta}">${safeCta}</a></p>
    ${calendarLink}`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Se liberó un cupo en ${data.itemKind === "class" ? "la clase" : "el evento"}: ${data.itemName}`,
    `${when} | ${data.location}`,
    `${data.ctaLabel}: ${data.bookUrl}`,
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Cupo liberado: ${data.itemName}`,
    html,
    text,
  };
}

// ─── Aviso "la clase fue cancelada" (a la waitlist) ─────────────────────────
export interface WaitlistClassCancelledData {
  toEmail: string;
  userName?: string;
  className: string;
  startAt: string;
  location: string;
  branding: EmailBranding;
}

export function buildWaitlistClassCancelledEmail(
  data: WaitlistClassCancelledData
): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const when = formatLongDateTime(data.startAt, branding.timezone);
  const safeName = escapeHtml(data.className);
  const safeLocation = escapeHtml(data.location);

  const body = `
    <p>${greeting},</p>
    <p>Lamentamos avisarte que la clase en la que estabas en lista de espera fue cancelada:</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${safeName}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">${escapeHtml(when)}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#5C5A56;">${safeLocation}</p>
      </td></tr>
    </table>
    <p>Te quitamos automáticamente de la lista de espera. Si quieres tomar otra clase, puedes verla desde el panel.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `La clase ${data.className} (${when}) fue cancelada.`,
    "Te quitamos automáticamente de la lista de espera.",
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Clase cancelada: ${data.className}`,
    html,
    text,
  };
}
