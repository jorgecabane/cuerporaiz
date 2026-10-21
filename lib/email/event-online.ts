/**
 * Emails de eventos online: links personales por cupo (bloque reutilizable),
 * correo directo a cada asistente y recordatorio del día.
 */
import type { SendEmailDto } from "@/lib/dto/email-dto";
import type { EventAttendee } from "@/lib/domain/event";
import { eventEntryUrl } from "@/lib/utils/event-entry-url";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { escapeHtml } from "./utils";
import { formatLongDateTime } from "./format-datetime";
import type { EmailBranding } from "./branding";

export type EntryLink = { label: string; url: string };

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
}

/** Links personales para el comprador ("Entrada 1 · tú", "Entrada 2 · Ana"). */
export function entryLinksFor(attendees: EventAttendee[], buyerEmail: string): EntryLink[] {
  return attendees.map((a) => {
    const who = a.seat === 1 || a.email === buyerEmail ? "tú" : (a.name ?? a.email);
    return { label: who ? `Entrada ${a.seat} · ${who}` : `Entrada ${a.seat}`, url: eventEntryUrl(a.token) };
  });
}

export function entryLinksHtml(links: EntryLink[], colorPrimary: string): string {
  const rows = links
    .map(
      (l) =>
        `<p style="margin:8px 0 0;font-size:14px;"><strong style="color:#2A2A2A;">${escapeHtml(l.label)}</strong><br><a href="${l.url}" style="color:${colorPrimary};word-break:break-all;">${l.url}</a></p>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" style="margin:16px 0;border:1px solid #E5DED3;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${colorPrimary};">Tus entradas</p>
        <p style="margin:4px 0 0;font-size:13px;color:#8A8782;">Cada link es personal. La sala se abre 10 minutos antes.</p>
        ${rows}
      </td></tr>
    </table>`;
}

export const entryLinksText = (links: EntryLink[]) => links.map((l) => `${l.label}: ${l.url}`).join("\n");

export interface EventAttendeeLinkEmailData {
  toEmail: string;
  attendeeName: string | null;
  buyerName: string;
  eventTitle: string;
  startsAt: Date;
  entryUrl: string;
  branding: EmailBranding;
}

export function buildEventAttendeeLinkEmail(data: EventAttendeeLinkEmailData): SendEmailDto {
  const { branding } = data;
  const when = formatLongDateTime(data.startsAt, branding.timezone);
  const greeting = data.attendeeName ? `Hola ${escapeHtml(data.attendeeName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>${escapeHtml(data.buyerName)} te regaló una entrada para <strong>${escapeHtml(data.eventTitle)}</strong>, el ${escapeHtml(when)}.</p>
    <p>Este es tu link personal. La sala se abre 10 minutos antes:</p>
    <p style="text-align:center;margin:24px 0;"><a href="${data.entryUrl}" style="${emailCtaStyle(branding.colorSecondary)}">Entrar al evento</a></p>
    <p style="font-size:13px;color:#8A8782;word-break:break-all;">${data.entryUrl}</p>`;
  const textGreeting = data.attendeeName ? `Hola ${data.attendeeName}` : "Hola";
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Tienes una entrada para ${data.eventTitle}`,
    html: emailBaseLayout({ body, branding }),
    text: [
      `${textGreeting},`,
      `${data.buyerName} te regaló una entrada para ${data.eventTitle} (${when}).`,
      `Tu link personal: ${data.entryUrl}`,
      `— ${branding.centerName}`,
    ].join("\n"),
  };
}

export interface EventOnlineReminderEmailData {
  toEmail: string;
  userName: string | null;
  eventTitle: string;
  startsAt: Date;
  entryLinks: EntryLink[];
  preferencesUrl?: string;
  branding: EmailBranding;
}

export function buildEventOnlineReminderEmail(data: EventOnlineReminderEmailData): SendEmailDto {
  const { branding } = data;
  const when = formatLongDateTime(data.startsAt, branding.timezone);
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p><strong>${escapeHtml(data.eventTitle)}</strong> es hoy, ${escapeHtml(when)}. ¡Te esperamos!</p>
    ${entryLinksHtml(data.entryLinks, branding.colorPrimary)}`;
  const textGreeting = data.userName ? `Hola ${data.userName}` : "Hola";
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Hoy: ${data.eventTitle}`,
    html: emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl }),
    text: [`${textGreeting},`, `${data.eventTitle} es hoy, ${when}.`, entryLinksText(data.entryLinks), `— ${branding.centerName}`].join(
      "\n"
    ),
  };
}
