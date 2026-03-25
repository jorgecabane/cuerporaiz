export interface EmailLayoutOptions {
  body: string;
  centerName: string;
  preferencesUrl?: string;
}

/**
 * Shared branded email HTML wrapper. All transactional emails use this.
 * Design: cream background (#F5F0E9), white card, primary header (#2D3B2A),
 * secondary CTA buttons (#B85C38), minimal and clean.
 */
export function emailBaseLayout({ body, centerName, preferencesUrl }: EmailLayoutOptions): string {
  const footerLinks = preferencesUrl
    ? `<p style="margin-top: 24px;"><a href="${preferencesUrl}" style="color: #5C5A56; font-size: 12px;">Preferencias de correo</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0E9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F0E9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 0 16px; text-align: center;">
              <span style="font-size: 20px; font-weight: 700; color: #2D3B2A; letter-spacing: -0.02em;">${centerName}</span>
            </td>
          </tr>
          <!-- Body Card -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 12px; padding: 32px; color: #333333; font-size: 15px; line-height: 1.6;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center; color: #5C5A56; font-size: 13px;">
              <p style="margin: 0;">&mdash; ${centerName}</p>
              ${footerLinks}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Inline style for CTA buttons in email body */
export const EMAIL_CTA_STYLE = 'display: inline-block; background-color: #B85C38; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;';
