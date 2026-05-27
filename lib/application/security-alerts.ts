/**
 * Push de eventos críticos de seguridad por email. Reusa sendEmailSafe (que
 * corre via after()/waitUntil en Vercel), así que es no-bloqueante. El destino
 * se controla con SECURITY_ALERT_EMAIL.
 */
import { sendEmailSafe as defaultSendEmailSafe } from "./send-email";
import type { SendEmailDto } from "@/lib/dto/email-dto";

export type SecuritySeverity = "CRITICAL" | "HIGH" | "WARNING";

export interface SecurityAlertInput {
  kind: string;
  severity: SecuritySeverity;
  metadata: Record<string, unknown>;
}

export interface SecurityAlertDeps {
  sendEmail?: (dto: SendEmailDto) => Promise<void>;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]!);
}

export async function sendSecurityAlert(
  input: SecurityAlertInput,
  deps: SecurityAlertDeps = {}
): Promise<void> {
  const recipient = process.env.SECURITY_ALERT_EMAIL ?? "";
  if (!recipient) {
    console.error("[security-alert] SECURITY_ALERT_EMAIL no configurado; evento descartado:", input.kind);
    return;
  }

  const sendEmail = deps.sendEmail ?? defaultSendEmailSafe;
  const from = process.env.EMAIL_FROM ?? "noreply@cuerporaiz.cl";

  const subject = `[🚨 cuerporaiz] ${input.severity} — ${input.kind}`;
  const metadataJson = JSON.stringify(input.metadata, null, 2);
  const text = [
    `Security event triggered.`,
    ``,
    `Kind:      ${input.kind}`,
    `Severity:  ${input.severity}`,
    `Timestamp: ${new Date().toISOString()}`,
    ``,
    `Metadata:`,
    metadataJson,
  ].join("\n");
  const html = `<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;

  await sendEmail({ from, to: [recipient], subject, html, text });
}
