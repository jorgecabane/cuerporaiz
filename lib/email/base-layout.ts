import type { EmailBranding } from "./branding";
import { defaultBranding } from "./branding";

export interface EmailLayoutOptions {
  body: string;
  branding: EmailBranding;
  preferencesUrl?: string;
}

/** Estilo inline para botones CTA. Recibe el secondary del branding. */
export function emailCtaStyle(secondary: string): string {
  return `display:inline-block;background-color:${secondary};color:#FFFFFF;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.01em;`;
}

/**
 * @deprecated Usar emailCtaStyle(branding.colorSecondary). Se mantiene por compat con tests viejos.
 */
export const EMAIL_CTA_STYLE = emailCtaStyle("#B85C38");

/** Layout base con branding por centro. Mobile-friendly via tablas + max-width 600px. */
export function emailBaseLayout({ body, branding, preferencesUrl }: EmailLayoutOptions): string {
  const b = branding ?? defaultBranding();

  // Header: logo (si existe) + nombre del centro en línea, ambos centrados sin fondo.
  const logoImg = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="" height="32" style="height:32px;width:auto;display:inline-block;vertical-align:middle;border:0;outline:none;text-decoration:none;margin-right:10px;">`
    : "";
  const header = `${logoImg}<span style="font-size:20px;font-weight:700;color:${b.colorPrimary};letter-spacing:-0.02em;vertical-align:middle;">${escapeAttr(b.centerName)}</span>`;

  const contactLines: string[] = [];
  if (b.contactAddress) contactLines.push(escapeAttr(b.contactAddress));
  if (b.contactPhone) contactLines.push(escapeAttr(b.contactPhone));
  if (b.contactEmail) {
    contactLines.push(`<a href="mailto:${b.contactEmail}" style="color:#5C5A56;text-decoration:none;">${escapeAttr(b.contactEmail)}</a>`);
  }

  const socials: string[] = [];
  if (b.instagramUrl) socials.push(`<a href="${b.instagramUrl}" style="color:${b.colorPrimary};text-decoration:none;font-weight:600;">Instagram</a>`);
  if (b.whatsappUrl) socials.push(`<a href="${b.whatsappUrl}" style="color:${b.colorPrimary};text-decoration:none;font-weight:600;">WhatsApp</a>`);

  const contactBlock = contactLines.length
    ? `<p style="margin:8px 0 0;font-size:12px;color:#5C5A56;line-height:1.5;">${contactLines.join(" &middot; ")}</p>`
    : "";
  const socialBlock = socials.length
    ? `<p style="margin:8px 0 0;font-size:12px;">${socials.join(" &middot; ")}</p>`
    : "";

  const prefsBlock = preferencesUrl
    ? `<p style="margin:12px 0 0;"><a href="${preferencesUrl}" style="color:#8A8782;font-size:11px;text-decoration:underline;">Preferencias de correo</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${escapeAttr(b.centerName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2A2A2A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:8px 0 24px;text-align:center;">${header}</td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF;border-radius:14px;padding:36px 32px;color:#2A2A2A;font-size:15px;line-height:1.65;border-top:3px solid ${b.colorPrimary};">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 8px;text-align:center;color:#5C5A56;font-size:13px;">
              <p style="margin:0;color:${b.colorPrimary};font-weight:600;">${escapeAttr(b.centerName)}</p>
              ${contactBlock}
              ${socialBlock}
              ${prefsBlock}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
