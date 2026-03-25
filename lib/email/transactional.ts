/**
 * Builders de emails transaccionales. Cada función devuelve un SendEmailDto
 * listo para IEmailProvider.send(). El remitente por defecto viene de EMAIL_FROM.
 */

import type { SendEmailDto } from "@/lib/dto/email-dto";
import { buildGoogleCalendarUrl, getAddToCalendarInstruction } from "@/lib/email/calendar";
import { SITE_NAME } from "@/lib/constants/copy";
import { emailBaseLayout, EMAIL_CTA_STYLE } from "./base-layout";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;
const DEFAULT_TIMEZONE = "America/Santiago";

// ─── Confirmación de reserva ───────────────────────────────────────────────
export interface ReservationConfirmationData {
  toEmail: string;
  userName?: string;
  className: string;
  startAt: string; // ISO
  endAt: string;
  location: string;
  /** URL del sitio para ver reservas o cancelar */
  myReservationsUrl?: string;
}

export function buildReservationConfirmationEmail(
  data: ReservationConfirmationData
): SendEmailDto {
  const calendarUrl = buildGoogleCalendarUrl({
    title: data.className,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    details: data.myReservationsUrl
      ? `Ver o cancelar reserva: ${data.myReservationsUrl}`
      : undefined,
    timeZone: DEFAULT_TIMEZONE,
  });
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Tu reserva quedó confirmada.</p>
    <p><strong>${data.className}</strong><br>
    ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })}<br>
    ${data.location}</p>
    <p><a href="${calendarUrl}" style="${EMAIL_CTA_STYLE}">Añadir a Google Calendar</a></p>
    ${data.myReservationsUrl ? `<p><a href="${data.myReservationsUrl}" style="color: #2D3B2A;">Ver mis reservas</a></p>` : ""}
    <p>Nos vemos en la práctica.</p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME });
  const text = [
    `${greeting},`,
    "Tu reserva quedó confirmada.",
    `${data.className} | ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })} | ${data.location}`,
    getAddToCalendarInstruction(calendarUrl),
    data.myReservationsUrl ? `Ver mis reservas: ${data.myReservationsUrl}` : "",
    `— ${SITE_NAME}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    from: DEFAULT_FROM,
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
}

export function buildClassReminderEmail(data: ClassReminderData): SendEmailDto {
  const calendarUrl = buildGoogleCalendarUrl({
    title: data.className,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    timeZone: DEFAULT_TIMEZONE,
  });
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Te recordamos que en ${data.hoursBefore} hora(s) tienes clase:</p>
    <p><strong>${data.className}</strong><br>
    ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })}<br>
    ${data.location}</p>
    <p><a href="${calendarUrl}" style="${EMAIL_CTA_STYLE}">Añadir a Google Calendar</a></p>
    <p>Nos vemos ahí.</p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME });
  const text = [
    `${greeting},`,
    `Te recordamos que en ${data.hoursBefore} hora(s) tienes clase:`,
    `${data.className} | ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })} | ${data.location}`,
    getAddToCalendarInstruction(calendarUrl),
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Recordatorio: ${data.className} hoy`,
    html,
    text,
  };
}

// ─── Aviso de cupo liberado ───────────────────────────────────────────────
export interface SpotFreedData {
  toEmail: string;
  userName?: string;
  className: string;
  startAt: string;
  endAt: string;
  location: string;
  bookUrl: string;
}

export function buildSpotFreedEmail(data: SpotFreedData): SendEmailDto {
  const calendarUrl = buildGoogleCalendarUrl({
    title: data.className,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    details: `Reservar: ${data.bookUrl}`,
    timeZone: DEFAULT_TIMEZONE,
  });
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Se liberó un cupo en la clase que tenías en lista de espera:</p>
    <p><strong>${data.className}</strong><br>
    ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })}<br>
    ${data.location}</p>
    <p><a href="${data.bookUrl}" style="${EMAIL_CTA_STYLE}">Reservar ahora</a></p>
    <p><a href="${calendarUrl}" style="color: #2D3B2A;">Añadir a Google Calendar</a></p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME });
  const text = [
    `${greeting},`,
    "Se liberó un cupo en la clase que tenías en lista de espera:",
    `${data.className} | ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })} | ${data.location}`,
    `Reservar ahora: ${data.bookUrl}`,
    getAddToCalendarInstruction(calendarUrl),
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Cupo liberado: ${data.className}`,
    html,
    text,
  };
}

// ─── Aviso a profesor por clase de prueba ───────────────────────────────────
export interface TrialClassNoticeToTeacherData {
  toEmail: string; // email de profesor/administración
  teacherName?: string;
  studentName: string;
  studentEmail: string;
  className: string;
  startAt: string;
  endAt: string;
  location: string;
}

export function buildTrialClassNoticeToTeacherEmail(
  data: TrialClassNoticeToTeacherData
): SendEmailDto {
  const calendarUrl = buildGoogleCalendarUrl({
    title: `Clase de prueba: ${data.studentName} - ${data.className}`,
    start: data.startAt,
    end: data.endAt,
    location: data.location,
    details: `Student: ${data.studentName} (${data.studentEmail})`,
    timeZone: DEFAULT_TIMEZONE,
  });
  const greeting = data.teacherName ? `Hola ${data.teacherName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Se agendó una <strong>clase de prueba</strong>:</p>
    <p><strong>Estudiante:</strong> ${data.studentName} (${data.studentEmail})<br>
    <strong>Clase:</strong> ${data.className}<br>
    <strong>Horario:</strong> ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })}<br>
    <strong>Lugar:</strong> ${data.location}</p>
    <p><a href="${calendarUrl}" style="${EMAIL_CTA_STYLE}">Añadir a Google Calendar</a></p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME });
  const text = [
    `${greeting},`,
    "Se agendó una clase de prueba:",
    `Student: ${data.studentName} (${data.studentEmail})`,
    `Clase: ${data.className} | ${new Date(data.startAt).toLocaleString("es-CL", { timeZone: DEFAULT_TIMEZONE })} | ${data.location}`,
    getAddToCalendarInstruction(calendarUrl),
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Clase de prueba agendada: ${data.studentName} - ${data.className}`,
    html,
    text,
  };
}

// ─── Aviso de pago fallido ──────────────────────────────────────────────────
export interface PaymentFailedData {
  toEmail: string;
  userName?: string;
  /** Ej. "Membresía mensual", "Pack 6 clases" */
  productName: string;
  /** URL para reintentar pago o actualizar método */
  retryPaymentUrl?: string;
}

export function buildPaymentFailedEmail(data: PaymentFailedData): SendEmailDto {
  const greeting = data.userName ? `Hola ${data.userName}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>No pudimos procesar el pago de <strong>${data.productName}</strong>.</p>
    <p>Revisa que tu método de pago sea válido y que tengas saldo disponible.</p>
    ${data.retryPaymentUrl ? `<p><a href="${data.retryPaymentUrl}" style="${EMAIL_CTA_STYLE}">Reintentar pago</a></p>` : ""}
    <p>Si el problema continúa, escríbenos por WhatsApp o responde este correo.</p>`;
  const html = emailBaseLayout({ body, centerName: SITE_NAME });
  const text = [
    `${greeting},`,
    `No pudimos procesar el pago de ${data.productName}.`,
    "Revisa que tu método de pago sea válido y que tengas saldo disponible.",
    data.retryPaymentUrl ? `Reintentar pago: ${data.retryPaymentUrl}` : "",
    "Si el problema continúa, escríbenos por WhatsApp o responde este correo.",
    `— ${SITE_NAME}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `No pudimos procesar tu pago — ${data.productName}`,
    html,
    text,
  };
}

// ─── Bienvenida a profesor/administración ───────────────────────────────────
export interface WelcomeStaffData {
  toEmail: string;
  name?: string;
  role: string;
  centerName: string;
  loginUrl: string;
}

export function buildWelcomeStaffEmail(data: WelcomeStaffData): SendEmailDto {
  const greeting = data.name ? `Hola ${data.name}` : "Hola";
  const roleLabel = data.role === "INSTRUCTOR" ? "profesor" : "administración";
  const body = `
    <p>${greeting},</p>
    <p>Te damos la bienvenida a <strong>${data.centerName}</strong>. Fuiste agregado como <strong>${roleLabel}</strong>.</p>
    <p>Para acceder al panel, crea tu cuenta usando este email (<strong>${data.toEmail}</strong>):</p>
    <p><a href="${data.loginUrl}" style="${EMAIL_CTA_STYLE}">Crear mi cuenta</a></p>
    <p>Si ya tienes cuenta con este email, simplemente inicia sesión.</p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = [
    `${greeting},`,
    `Te damos la bienvenida a ${data.centerName}. Fuiste agregado como ${roleLabel}.`,
    `Para acceder, crea tu cuenta usando este email (${data.toEmail}):`,
    data.loginUrl,
    "Si ya tienes cuenta con este email, simplemente inicia sesión.",
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Bienvenida a ${data.centerName} — ${SITE_NAME}`,
    html,
    text,
  };
}

// ─── Bienvenida a estudiante ────────────────────────────────────────────────
export interface WelcomeStudentData {
  toEmail: string;
  userName: string;
  centerName: string;
  dashboardUrl: string;
  profileUrl: string;
}

export function buildWelcomeStudentEmail(data: WelcomeStudentData): SendEmailDto {
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Te damos la bienvenida a <strong>${data.centerName}</strong>.</p>
    <p>Desde tu panel puedes reservar clases, ver tu plan y gestionar tu cuenta.</p>
    <p><a href="${data.dashboardUrl}" style="${EMAIL_CTA_STYLE}">Ir al panel</a></p>
    <p style="margin-top: 16px;"><a href="${data.profileUrl}" style="color: #2D3B2A;">Completar mi perfil</a></p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = `Hola ${data.userName}, bienvenido/a a ${data.centerName}. Ir al panel: ${data.dashboardUrl}`;
  return { from: DEFAULT_FROM, to: [data.toEmail], subject: `Bienvenido/a a ${data.centerName}`, html, text };
}

// ─── Plan por vencer ────────────────────────────────────────────────────────
export interface PlanExpiringData {
  toEmail: string;
  userName: string;
  centerName: string;
  planName: string;
  expiryDate: string;
  tiendaUrl: string;
  preferencesUrl: string;
}

export function buildPlanExpiringEmail(data: PlanExpiringData): SendEmailDto {
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Tu plan <strong>${data.planName}</strong> vence el <strong>${data.expiryDate}</strong>.</p>
    <p>Renueva para seguir disfrutando de tus clases.</p>
    <p><a href="${data.tiendaUrl}" style="${EMAIL_CTA_STYLE}">Renovar plan</a></p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName, preferencesUrl: data.preferencesUrl });
  const text = `Hola ${data.userName}, tu plan ${data.planName} vence el ${data.expiryDate}. Renueva en: ${data.tiendaUrl}`;
  return { from: DEFAULT_FROM, to: [data.toEmail], subject: `Tu plan ${data.planName} vence pronto`, html, text };
}

// ─── Confirmación de compra ─────────────────────────────────────────────────
export interface PurchaseConfirmationData {
  toEmail: string;
  userName: string;
  centerName: string;
  planName: string;
  amountFormatted: string;
  validUntil: string;
  tiendaUrl: string;
  preferencesUrl: string;
}

export function buildPurchaseConfirmationEmail(data: PurchaseConfirmationData): SendEmailDto {
  const body = `
    <p>Hola ${data.userName},</p>
    <p>Tu compra fue confirmada.</p>
    <p><strong>${data.planName}</strong><br>
    Monto: ${data.amountFormatted}<br>
    Vigencia hasta: ${data.validUntil}</p>
    <p><a href="${data.tiendaUrl}" style="${EMAIL_CTA_STYLE}">Ver mi plan</a></p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName, preferencesUrl: data.preferencesUrl });
  const text = `Hola ${data.userName}, tu compra de ${data.planName} (${data.amountFormatted}) fue confirmada. Vigencia hasta ${data.validUntil}.`;
  return { from: DEFAULT_FROM, to: [data.toEmail], subject: `Compra confirmada: ${data.planName}`, html, text };
}
