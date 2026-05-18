/**
 * Builders de emails transaccionales. Cada función devuelve un SendEmailDto
 * listo para IEmailProvider.send(). El remitente por defecto viene de EMAIL_FROM.
 *
 * Cada builder recibe un `branding: EmailBranding` (logo + colores + tz + contacto)
 * que se aplica al layout y al formato de fechas.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { buildGoogleCalendarUrl, getAddToCalendarInstruction } from "@/lib/email/calendar";
import { emailBaseLayout, emailCtaStyle } from "./base-layout";
import { plainTextToHtmlParagraphs } from "./utils";
import { formatLongDateTime, formatLongDate } from "./format-datetime";
import type { EmailBranding } from "./branding";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

function fromForBranding(b: EmailBranding): string {
  return process.env.EMAIL_FROM ?? `${b.centerName} <onboarding@resend.dev>`;
}

// ─── Confirmación de reserva ───────────────────────────────────────────────
export interface ReservationConfirmationData {
  toEmail: string;
  userName?: string;
  className: string;
  startAt: string; // ISO
  endAt: string;
  location: string;
  myReservationsUrl?: string;
  branding: EmailBranding;
}

export function buildReservationConfirmationEmail(
  data: ReservationConfirmationData
): SendEmailDto {
  const { branding } = data;
  const calendarUrl = buildGoogleCalendarUrl({
    title: data.className,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    details: data.myReservationsUrl
      ? `Ver o cancelar reserva: ${data.myReservationsUrl}`
      : undefined,
    timeZone: branding.timezone,
  });
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const when = formatLongDateTime(data.startAt, branding.timezone);
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Tu reserva quedó confirmada.</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${data.className}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">${when}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#5C5A56;">${data.location}</p>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;"><a href="${calendarUrl}" style="${cta}">Añadir a Google Calendar</a></p>
    ${data.myReservationsUrl ? `<p style="text-align:center;font-size:13px;"><a href="${data.myReservationsUrl}" style="color:${branding.colorPrimary};">Ver mis reservas</a></p>` : ""}
    <p style="margin-top:24px;">Nos vemos en la práctica.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    "Tu reserva quedó confirmada.",
    `${data.className} | ${when} | ${data.location}`,
    getAddToCalendarInstruction(calendarUrl),
    data.myReservationsUrl ? `Ver mis reservas: ${data.myReservationsUrl}` : "",
    `— ${branding.centerName}`,
  ].filter(Boolean).join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Reserva confirmada: ${data.className}`,
    html,
    text,
  };
}

// ─── Recordatorio antes de clase ────────────────────────────────────────────
export interface ClassReminderData {
  toEmail: string;
  userName?: string;
  className: string;
  startAt: string;
  endAt: string;
  location: string;
  hoursBefore: number;
  branding: EmailBranding;
}

export function buildClassReminderEmail(data: ClassReminderData): SendEmailDto {
  const { branding } = data;
  const calendarUrl = buildGoogleCalendarUrl({
    title: data.className,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    timeZone: branding.timezone,
  });
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const when = formatLongDateTime(data.startAt, branding.timezone);
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Te recordamos que en <strong>${data.hoursBefore} hora(s)</strong> tienes clase:</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${data.className}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">${when}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#5C5A56;">${data.location}</p>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;"><a href="${calendarUrl}" style="${cta}">Añadir a Google Calendar</a></p>
    <p>Nos vemos ahí.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `En ${data.hoursBefore} hora(s) tienes clase: ${data.className} | ${when} | ${data.location}`,
    getAddToCalendarInstruction(calendarUrl),
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Recordatorio: ${data.className} hoy`,
    html,
    text,
  };
}

// ─── Aviso a profesor por clase de prueba ───────────────────────────────────
export interface TrialClassNoticeToTeacherData {
  toEmail: string;
  teacherName?: string;
  studentName: string;
  studentEmail: string;
  className: string;
  startAt: string;
  endAt: string;
  location: string;
  branding: EmailBranding;
}

export function buildTrialClassNoticeToTeacherEmail(
  data: TrialClassNoticeToTeacherData
): SendEmailDto {
  const { branding } = data;
  const calendarUrl = buildGoogleCalendarUrl({
    title: `Clase de prueba: ${data.studentName} - ${data.className}`,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    details: `Estudiante: ${data.studentName} (${data.studentEmail})`,
    timeZone: branding.timezone,
  });
  const greeting = data.teacherName ? `Hola ${data.teacherName}` : "Hola";
  const when = formatLongDateTime(data.startAt, branding.timezone);
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Se agendó una <strong>clase de prueba</strong>:</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#5C5A56;">Estudiante</p>
        <p style="margin:2px 0 10px;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${data.studentName} <span style="font-weight:400;color:#5C5A56;">· ${data.studentEmail}</span></p>
        <p style="margin:0;font-size:14px;color:#5C5A56;">Clase</p>
        <p style="margin:2px 0 10px;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${data.className}</p>
        <p style="margin:0;font-size:14px;color:#5C5A56;">${when} · ${data.location}</p>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;"><a href="${calendarUrl}" style="${cta}">Añadir a Google Calendar</a></p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    "Clase de prueba agendada:",
    `Estudiante: ${data.studentName} (${data.studentEmail})`,
    `${data.className} | ${when} | ${data.location}`,
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Clase de prueba: ${data.studentName} - ${data.className}`,
    html,
    text,
  };
}

// ─── Aviso de pago fallido ──────────────────────────────────────────────────
export interface PaymentFailedData {
  toEmail: string;
  userName?: string;
  productName: string;
  retryPaymentUrl?: string;
  branding: EmailBranding;
}

export function buildPaymentFailedEmail(data: PaymentFailedData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>No pudimos procesar el pago de <strong>${data.productName}</strong>.</p>
    <p>Revisa que tu método de pago sea válido y que tengas saldo disponible.</p>
    ${data.retryPaymentUrl ? `<p style="text-align:center;margin:24px 0;"><a href="${data.retryPaymentUrl}" style="${cta}">Reintentar pago</a></p>` : ""}
    <p style="font-size:13px;color:#5C5A56;">Si el problema continúa, escríbenos${branding.contactEmail ? ` a <a href="mailto:${branding.contactEmail}" style="color:${branding.colorPrimary};">${branding.contactEmail}</a>` : ""} o responde este correo.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `No pudimos procesar el pago de ${data.productName}.`,
    "Revisa que tu método de pago sea válido y que tengas saldo disponible.",
    data.retryPaymentUrl ? `Reintentar pago: ${data.retryPaymentUrl}` : "",
    `— ${branding.centerName}`,
  ].filter(Boolean).join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `No pudimos procesar tu pago — ${data.productName}`,
    html,
    text,
  };
}

// ─── Bienvenida a profesor / administración ─────────────────────────────────
export interface WelcomeStaffData {
  toEmail: string;
  name?: string;
  role: string;
  /** Link a /auth/set-password?token=... */
  setPasswordUrl: string;
  branding: EmailBranding;
}

export function buildWelcomeStaffEmail(data: WelcomeStaffData): SendEmailDto {
  const { branding } = data;
  const greeting = data.name ? `Hola ${data.name}` : "Hola";
  const roleLabel = data.role === "INSTRUCTOR" ? "profesor/a" : "administración";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>${greeting},</p>
    <p>Te damos la bienvenida a <strong>${branding.centerName}</strong>. Fuiste agregado/a como <strong>${roleLabel}</strong>.</p>
    <p>Para acceder al panel, define tu contraseña:</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.setPasswordUrl}" style="${cta}">Crear mi contraseña</a></p>
    <p style="font-size:12px;color:#5C5A56;">¿No funciona el botón? Copiá y pegá este link en tu navegador:</p>
    <p style="font-size:12px;word-break:break-all;background:#F5F0E9;padding:10px;border-radius:6px;color:#2A2A2A;">${data.setPasswordUrl}</p>
    <p style="font-size:13px;color:#5C5A56;">Este enlace expira en 7 días.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Te damos la bienvenida a ${branding.centerName}. Fuiste agregado/a como ${roleLabel}.`,
    `Crear contraseña: ${data.setPasswordUrl}`,
    "Este enlace expira en 7 días.",
    `— ${branding.centerName}`,
  ].join("\n");

  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Bienvenida a ${branding.centerName}`,
    html,
    text,
  };
}

// ─── Bienvenida a estudiante (signup directo) ───────────────────────────────
export interface WelcomeStudentData {
  toEmail: string;
  userName: string;
  dashboardUrl: string;
  profileUrl: string;
  /** Fragmento libre configurado por el admin del centro (texto plano). */
  customBodyFragment?: string;
  branding: EmailBranding;
}

export function buildWelcomeStudentEmail(data: WelcomeStudentData): SendEmailDto {
  const { branding } = data;
  const customBlock = data.customBodyFragment
    ? `<div style="margin:20px 0;padding:16px;background:#F5F0E9;border-left:3px solid ${branding.colorSecondary};border-radius:6px;font-size:14px;">${plainTextToHtmlParagraphs(data.customBodyFragment)}</div>`
    : "";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p style="font-size:18px;margin:0 0 8px;">¡Hola ${data.userName}! 🌿</p>
    <p style="font-size:16px;margin:0 0 16px;">Qué bueno tenerte en <strong>${branding.centerName}</strong>.</p>
    <p>Estamos para acompañarte en tu práctica. Desde tu panel podés reservar clases, ver tu plan y gestionar tu cuenta.</p>
    ${customBlock}
    <p style="font-weight:600;margin:24px 0 12px;color:${branding.colorPrimary};">Tus primeros pasos</p>
    <table role="presentation" width="100%" style="margin:0 0 8px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #EAE3D7;font-size:14px;">1. Completá tu perfil — datos de contacto y avatar</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #EAE3D7;font-size:14px;">2. Revisá los horarios y reservá tu primera clase</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;">3. Si tienes lesiones o consultas, escribinos${branding.contactEmail ? ` a <a href="mailto:${branding.contactEmail}" style="color:${branding.colorPrimary};">${branding.contactEmail}</a>` : ""}</td></tr>
    </table>
    <p style="text-align:center;margin:28px 0 12px;"><a href="${data.dashboardUrl}" style="${cta}">Entrar al panel</a></p>
    <p style="text-align:center;font-size:13px;margin:0;"><a href="${data.profileUrl}" style="color:${branding.colorPrimary};">Completar mi perfil →</a></p>`;
  const html = emailBaseLayout({ body, branding });
  const tail = data.customBodyFragment ? `\n\n${data.customBodyFragment.trim()}` : "";
  const text = `¡Hola ${data.userName}! Bienvenido/a a ${branding.centerName}.${tail}\n\nIr al panel: ${data.dashboardUrl}`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `¡Bienvenido/a a ${branding.centerName}!`,
    html,
    text,
  };
}

// ─── Bienvenida a estudiante creado por admin (con set-password) ────────────
export interface WelcomeStudentByAdminData {
  toEmail: string;
  userName: string;
  /** Link a /auth/set-password?token=... */
  setPasswordUrl: string;
  customBodyFragment?: string;
  branding: EmailBranding;
}

export function buildWelcomeStudentByAdminEmail(data: WelcomeStudentByAdminData): SendEmailDto {
  const { branding } = data;
  const customBlock = data.customBodyFragment
    ? `<div style="margin:20px 0;padding:16px;background:#F5F0E9;border-left:3px solid ${branding.colorSecondary};border-radius:6px;font-size:14px;">${plainTextToHtmlParagraphs(data.customBodyFragment)}</div>`
    : "";
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p style="font-size:18px;margin:0 0 8px;">¡Hola ${data.userName}! 🌿</p>
    <p style="font-size:16px;margin:0 0 16px;">Te damos la bienvenida a <strong>${branding.centerName}</strong>.</p>
    <p>El equipo te creó una cuenta. Define tu contraseña con este link y vas a poder reservar clases y gestionar tu plan:</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.setPasswordUrl}" style="${cta}">Crear mi contraseña</a></p>
    <p style="font-size:12px;color:#5C5A56;">¿No funciona el botón? Copiá y pegá este link en tu navegador:</p>
    <p style="font-size:12px;word-break:break-all;background:#F5F0E9;padding:10px;border-radius:6px;color:#2A2A2A;">${data.setPasswordUrl}</p>
    <p style="font-size:13px;color:#5C5A56;">Este enlace expira en 7 días.</p>
    ${customBlock}`;
  const html = emailBaseLayout({ body, branding });
  const tail = data.customBodyFragment ? `\n\n${data.customBodyFragment.trim()}` : "";
  const text = `¡Hola ${data.userName}! El equipo de ${branding.centerName} creó tu cuenta. Crea tu contraseña: ${data.setPasswordUrl}${tail}`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Activá tu cuenta — ${branding.centerName}`,
    html,
    text,
  };
}

// ─── Clase cancelada por el centro ──────────────────────────────────────────
export interface ClassCancelledData {
  toEmail: string;
  userName?: string;
  className: string;
  startAt: string;
  tiendaUrl?: string;
  branding: EmailBranding;
}

export function buildClassCancelledEmail(data: ClassCancelledData): SendEmailDto {
  const { branding } = data;
  const when = formatLongDateTime(data.startAt, branding.timezone);
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const cta = emailCtaStyle(branding.colorSecondary);
  const ctaLink = data.tiendaUrl
    ? `<p style="text-align:center;margin:24px 0;"><a href="${data.tiendaUrl}" style="${cta}">Ver agenda y reagendar</a></p>`
    : "";
  const body = `
    <p>${greeting},</p>
    <p>Queríamos avisarte que la clase <strong>${data.className}</strong> del ${when} fue cancelada por <strong>${branding.centerName}</strong>.</p>
    <p>Tu reserva fue cancelada sin consumo de clase. Lamentamos la molestia.</p>
    ${ctaLink}`;
  const html = emailBaseLayout({ body, branding });
  const text = `${greeting}, la clase "${data.className}" del ${when} fue cancelada por ${branding.centerName}. Tu reserva fue cancelada sin consumo de clase.`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Clase cancelada — ${data.className}`,
    html,
    text,
  };
}

// ─── Plan por vencer ────────────────────────────────────────────────────────
export interface PlanExpiringData {
  toEmail: string;
  userName: string;
  planName: string;
  expiryDate: string;
  tiendaUrl: string;
  preferencesUrl: string;
  branding: EmailBranding;
}

export function buildPlanExpiringEmail(data: PlanExpiringData): SendEmailDto {
  const { branding } = data;
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Tu plan <strong>${data.planName}</strong> vence el <strong>${data.expiryDate}</strong>.</p>
    <p>Renovalo para seguir disfrutando de tus clases.</p>
    <p style="text-align:center;margin:28px 0;"><a href="${data.tiendaUrl}" style="${cta}">Renovar plan</a></p>`;
  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });
  const text = `Hola ${data.userName}, tu plan ${data.planName} vence el ${data.expiryDate}. Renovalo en: ${data.tiendaUrl}`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Tu plan ${data.planName} vence pronto`,
    html,
    text,
  };
}

// ─── Confirmación de compra ─────────────────────────────────────────────────
export interface PurchaseConfirmationData {
  toEmail: string;
  userName: string;
  planName: string;
  amountFormatted: string;
  validUntil: string;
  tiendaUrl: string;
  preferencesUrl: string;
  branding: EmailBranding;
}

export function buildPurchaseConfirmationEmail(data: PurchaseConfirmationData): SendEmailDto {
  const { branding } = data;
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Tu compra fue confirmada. ¡Que la disfrutes!</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${data.planName}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">Monto: <strong style="color:#2A2A2A;">${data.amountFormatted}</strong></p>
        <p style="margin:4px 0 0;font-size:14px;color:#5C5A56;">Vigencia hasta: <strong style="color:#2A2A2A;">${data.validUntil}</strong></p>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;"><a href="${data.tiendaUrl}" style="${cta}">Ver mi plan</a></p>`;
  const html = emailBaseLayout({ body, branding, preferencesUrl: data.preferencesUrl });
  const text = `Hola ${data.userName}, tu compra de ${data.planName} (${data.amountFormatted}) fue confirmada. Vigencia hasta ${data.validUntil}.`;
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Compra confirmada: ${data.planName}`,
    html,
    text,
  };
}

// ─── Transferencia recibida (procesando) ────────────────────────────────────
export interface TransferReceivedData {
  toEmail: string;
  userName: string;
  itemName: string;
  amountFormatted: string;
  misPagosUrl: string;
  branding: EmailBranding;
}

export function buildTransferReceivedEmail(data: TransferReceivedData): SendEmailDto {
  const { branding } = data;
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Estamos procesando tu pago. <strong>${branding.centerName}</strong> revisará la transferencia y te avisaremos por mail apenas esté aprobada.</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:16px;font-weight:600;color:${branding.colorPrimary};">${data.itemName}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#5C5A56;">Monto declarado: <strong style="color:#2A2A2A;">${data.amountFormatted}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;color:#8A8782;">Hasta entonces tu compra figura como <em>pendiente</em>.</p>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;"><a href="${data.misPagosUrl}" style="${cta}">Ver mis pagos</a></p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `Hola ${data.userName},`,
    `Estamos procesando el pago de ${data.itemName} (${data.amountFormatted}).`,
    `${branding.centerName} aprobará la transferencia apenas pueda verificarla. Te avisaremos por mail.`,
    `Ver mis pagos: ${data.misPagosUrl}`,
  ].join("\n");
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Procesando tu pago — ${data.itemName}`,
    html,
    text,
  };
}

// ─── Transferencia rechazada ────────────────────────────────────────────────
export interface TransferRejectedData {
  toEmail: string;
  userName: string;
  itemName: string;
  amountFormatted: string;
  reason: string;
  contactEmail: string;
  tiendaUrl: string;
  branding: EmailBranding;
}

export function buildTransferRejectedEmail(data: TransferRejectedData): SendEmailDto {
  const { branding } = data;
  const safeReason = data.reason.replace(/[<>]/g, "");
  const cta = emailCtaStyle(branding.colorSecondary);
  const body = `
    <p>Hola ${data.userName},</p>
    <p><strong>${branding.centerName}</strong> rechazó tu transferencia para <strong>${data.itemName}</strong> (${data.amountFormatted}).</p>
    <div style="margin:16px 0;padding:14px 16px;background:#FFF4ED;border-left:3px solid ${branding.colorSecondary};border-radius:6px;">
      <p style="margin:0;font-size:13px;color:#8A8782;text-transform:uppercase;letter-spacing:0.05em;">Motivo</p>
      <p style="margin:4px 0 0;font-size:14px;">"${safeReason}"</p>
    </div>
    <p>Si fue un error, comunicate con el centro: <a href="mailto:${data.contactEmail}" style="color:${branding.colorPrimary};">${data.contactEmail}</a>. También puedes intentar comprar de nuevo:</p>
    <p style="text-align:center;margin:24px 0;"><a href="${data.tiendaUrl}" style="${cta}">Volver a la tienda</a></p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `Hola ${data.userName},`,
    `${branding.centerName} rechazó tu transferencia para ${data.itemName} (${data.amountFormatted}).`,
    `Motivo: "${safeReason}"`,
    `Contacto: ${data.contactEmail}`,
    `Volver a la tienda: ${data.tiendaUrl}`,
  ].join("\n");
  return {
    from: fromForBranding(branding),
    to: [data.toEmail],
    subject: `Transferencia rechazada — ${data.itemName}`,
    html,
    text,
  };
}

// ─── Subscription emails ────────────────────────────────────────────────────

export interface SubscriptionConfirmedData {
  toEmail: string;
  userName: string;
  planName: string;
  amountFormatted: string;
  nextChargeDate: string;
  branding: EmailBranding;
}

export function buildSubscriptionConfirmedEmail(data: SubscriptionConfirmedData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Tu suscripción a <strong>${data.planName}</strong> en ${branding.centerName} está activa.</p>
    <table role="presentation" width="100%" style="margin:16px 0;background:#F5F0E9;border-radius:10px;padding:16px;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#5C5A56;">Cobro automático</p>
        <p style="margin:2px 0 10px;font-size:18px;font-weight:600;color:${branding.colorPrimary};">${data.amountFormatted}</p>
        <p style="margin:0;font-size:14px;color:#5C5A56;">Próximo cobro: <strong style="color:#2A2A2A;">${data.nextChargeDate}</strong></p>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#5C5A56;">Puedes cancelar cuando quieras desde tu perfil.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Tu suscripción a ${data.planName} está activa.`,
    `Cobro automático: ${data.amountFormatted}. Próximo cobro: ${data.nextChargeDate}.`,
  ].join("\n");
  return { from: fromForBranding(branding), to: [data.toEmail], subject: `Suscripción activa — ${data.planName}`, html, text };
}

export interface SubscriptionRenewalData {
  toEmail: string;
  userName: string;
  planName: string;
  amountFormatted: string;
  nextChargeDate: string;
  branding: EmailBranding;
}

export function buildSubscriptionRenewalEmail(data: SubscriptionRenewalData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Se cobró <strong>${data.amountFormatted}</strong> por tu suscripción a <strong>${data.planName}</strong>.</p>
    <p>Tu plan ha sido renovado. Próximo cobro: <strong>${data.nextChargeDate}</strong>.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Se cobró ${data.amountFormatted} por tu suscripción a ${data.planName}.`,
    `Plan renovado. Próximo cobro: ${data.nextChargeDate}.`,
  ].join("\n");
  return { from: fromForBranding(branding), to: [data.toEmail], subject: `Cobro realizado — ${data.planName}`, html, text };
}

export interface SubscriptionCancelledData {
  toEmail: string;
  userName: string;
  planName: string;
  accessUntil: string;
  branding: EmailBranding;
}

export function buildSubscriptionCancelledEmail(data: SubscriptionCancelledData): SendEmailDto {
  const { branding } = data;
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Tu suscripción a <strong>${data.planName}</strong> en ${branding.centerName} fue cancelada.</p>
    <p>Tienes acceso hasta el <strong>${data.accessUntil}</strong>.</p>
    <p style="font-size:13px;color:#5C5A56;">Si fue un error, puedes volver a suscribirte desde la tienda.</p>`;
  const html = emailBaseLayout({ body, branding });
  const text = [
    `${greeting},`,
    `Tu suscripción a ${data.planName} fue cancelada. Tienes acceso hasta el ${data.accessUntil}.`,
  ].join("\n");
  return { from: fromForBranding(branding), to: [data.toEmail], subject: `Suscripción cancelada — ${data.planName}`, html, text };
}

// Re-export helpers para callers que aún los esperan.
export { DEFAULT_FROM };
// Re-export para tipos auxiliares
export { formatLongDate };
