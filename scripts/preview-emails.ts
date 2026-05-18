/**
 * Renderiza con datos mock todos los emails del proyecto y los guarda en
 * tmp/email-previews/ (un .html por correo + index.html con un catastro).
 *
 * Uso:  npx tsx scripts/preview-emails.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildReservationConfirmationEmail,
  buildClassReminderEmail,
  buildSpotFreedEmail,
  buildWaitlistClassCancelledEmail,
  buildTrialClassNoticeToTeacherEmail,
  buildPaymentFailedEmail,
  buildWelcomeStudentEmail,
  buildWelcomeStudentByAdminEmail,
  buildWelcomeStaffEmail,
  buildPlanExpiringEmail,
  buildPurchaseConfirmationEmail,
  buildClassCancelledEmail,
  buildTransferReceivedEmail,
  buildTransferRejectedEmail,
  buildSubscriptionConfirmedEmail,
  buildSubscriptionRenewalEmail,
  buildSubscriptionCancelledEmail,
} from "@/lib/email";
import {
  buildForgotPasswordEmail,
  buildEmailVerificationEmail,
} from "@/lib/email/auth";
import { buildEventTicketConfirmationEmail } from "@/lib/email/event";
import {
  buildLessonUnlockedEmail,
  buildQuotaExhaustedEmail,
  buildNewContentEmail,
} from "@/lib/email/on-demand";
import type { EmailBranding } from "@/lib/email/branding";

type Status = "active" | "orphan";

interface EmailEntry {
  slug: string;
  title: string;
  trigger: string;
  recipient: string;
  status: Status;
  dto: { subject: string; html: string; to: string[] };
}

// ─── Mocks de centros con branding distinto, para mostrar la diferencia ─────
const BRAND_PUCON: EmailBranding = {
  centerId: "ctr_pucon",
  centerName: "Cuerpo Raíz Pucón",
  timezone: "America/Santiago",
  // Logo mock: monograma simple en cream/transparente, sin recuadro de color
  logoUrl: "https://placehold.co/64x64/F5F0E9/2D3B2A.png?text=%E2%98%BC&font=playfair-display",
  colorPrimary: "#2D3B2A",
  colorSecondary: "#B85C38",
  contactEmail: "hola@cuerporaizpucon.cl",
  contactPhone: "+56 9 1234 5678",
  contactAddress: "Av. O'Higgins 555, Pucón",
  whatsappUrl: "https://wa.me/56912345678",
  instagramUrl: "https://instagram.com/cuerporaizpucon",
};

// Centro alternativo con paleta distinta para demostrar branding por tenant
const BRAND_TRINIDAD: EmailBranding = {
  centerId: "ctr_trinidad",
  centerName: "Cuerpo Raíz Trinidad",
  timezone: "America/Santiago",
  logoUrl: null,
  colorPrimary: "#1F4E5F",
  colorSecondary: "#E8A87C",
  contactEmail: "hola@cuerporaiztrinidad.cl",
  contactPhone: null,
  contactAddress: "Las Condes 1234, Santiago",
  whatsappUrl: null,
  instagramUrl: "https://instagram.com/cuerporaiztrinidad",
};

const STUDENT = "Camila Soto";
const STUDENT_EMAIL = "camila@example.com";
const TEACHER_EMAIL = "profe@cuerporaiz.cl";
const ADMIN_EMAIL = "hola@cuerporaizpucon.cl";
const BASE = "https://cuerporaiz.cl";
const START = new Date("2026-05-12T18:30:00-04:00").toISOString();
const END = new Date("2026-05-12T19:45:00-04:00").toISOString();

// Para no repetir tanto, branding default es Pucón
const B = BRAND_PUCON;

const entries: EmailEntry[] = [
  {
    slug: "01-reservation-confirmation",
    title: "Confirmación de reserva",
    trigger: "lib/application/reserve-class.ts — al reservar (location desde site.contactAddress)",
    recipient: "Estudiante",
    status: "active",
    dto: buildReservationConfirmationEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      className: "Hatha Yoga Nivel Intermedio",
      startAt: START,
      endAt: END,
      location: "Av. O'Higgins 555, Pucón",
      myReservationsUrl: `${BASE}/panel/reservas`,
      branding: B,
    }),
  },
  {
    slug: "02-class-cancelled",
    title: "Clase cancelada por el centro",
    trigger: "app/panel/horarios/actions.ts — admin cancela clase",
    recipient: "Estudiante con reserva",
    status: "active",
    dto: buildClassCancelledEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      className: "Vinyasa Flow",
      startAt: START,
      tiendaUrl: `${BASE}/horarios`,
      branding: B,
    }),
  },
  {
    slug: "03-welcome-student",
    title: "Bienvenida a estudiante (signup directo)",
    trigger: "app/api/auth/signup/route.ts — al crear cuenta",
    recipient: "Estudiante recién registrado",
    status: "active",
    dto: buildWelcomeStudentEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      dashboardUrl: `${BASE}/panel`,
      profileUrl: `${BASE}/panel/mi-perfil`,
      customBodyFragment:
        "Te recomendamos llegar 10 minutos antes a tu primera clase. Si tienes lesiones, avísale a tu profe.",
      branding: B,
    }),
  },
  {
    slug: "04-welcome-student-by-admin",
    title: "Bienvenida estudiante creado por admin (set-password)",
    trigger: "app/panel/clientes/actions.ts — admin agrega cliente",
    recipient: "Estudiante recién agregado",
    status: "active",
    dto: buildWelcomeStudentByAdminEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      setPasswordUrl: `${BASE}/auth/reset-password?token=mock-invite-7d-abc&invite=1`,
      customBodyFragment: "Te esperamos cuando puedas pasar a tu primera clase.",
      branding: B,
    }),
  },
  {
    slug: "05-email-verification",
    title: "Verificación de email (con URL en texto plano)",
    trigger: "app/api/auth/signup/route.ts + /api/auth/resend-verification",
    recipient: "Usuario nuevo",
    status: "active",
    dto: buildEmailVerificationEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      verifyUrl: `${BASE}/auth/verify-email?token=mock-token-abc123`,
      branding: B,
    }),
  },
  {
    slug: "06-forgot-password",
    title: "Recuperar contraseña (con URL en texto plano)",
    trigger: "app/api/auth/forgot-password/route.ts",
    recipient: "Usuario que pidió reset",
    status: "active",
    dto: buildForgotPasswordEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      resetUrl: `${BASE}/auth/reset-password?token=mock-reset-xyz789`,
      branding: B,
    }),
  },
  {
    slug: "07-welcome-staff",
    title: "Bienvenida profesor/admin (set-password con token)",
    trigger: "app/panel/profesores/actions.ts — admin agrega staff",
    recipient: "Profesor o administrador",
    status: "active",
    dto: buildWelcomeStaffEmail({
      toEmail: TEACHER_EMAIL,
      name: "Andrea Martínez",
      role: "INSTRUCTOR",
      setPasswordUrl: `${BASE}/auth/reset-password?token=mock-staff-7d-xyz&invite=1`,
      branding: B,
    }),
  },
  {
    slug: "08-plan-expiring",
    title: "Plan por vencer (solo planes sin auto-renovación)",
    trigger: "/api/cron/plan-expiring — filtra subscriptionId:null",
    recipient: "Estudiante con plan próximo a vencer",
    status: "active",
    dto: buildPlanExpiringEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      planName: "Mensualidad libre",
      expiryDate: "12 de mayo de 2026",
      tiendaUrl: `${BASE}/panel/tienda`,
      preferencesUrl: `${BASE}/panel/mi-perfil?tab=correos`,
      branding: B,
    }),
  },
  {
    slug: "09-purchase-confirmation",
    title: "Compra confirmada (MercadoPago)",
    trigger: "lib/application/activate-plan.ts — webhook MP aprobado",
    recipient: "Estudiante",
    status: "active",
    dto: buildPurchaseConfirmationEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      planName: "Pack 8 clases",
      amountFormatted: "$48.000 CLP",
      validUntil: "12 de junio de 2026",
      tiendaUrl: `${BASE}/panel/mi-plan`,
      preferencesUrl: `${BASE}/panel/mi-perfil?tab=correos`,
      branding: B,
    }),
  },
  {
    slug: "10-transfer-received",
    title: "Transferencia recibida (procesando — copy nuevo)",
    trigger: "lib/application/claim-transfer.ts",
    recipient: "Estudiante",
    status: "active",
    dto: buildTransferReceivedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      itemName: "Pack 8 clases",
      amountFormatted: "$48.000 CLP",
      misPagosUrl: `${BASE}/panel/mis-pagos`,
      branding: B,
    }),
  },
  {
    slug: "11-transfer-rejected",
    title: "Transferencia rechazada (contactEmail con fallback site config)",
    trigger: "lib/application/reject-transfer-order.ts",
    recipient: "Estudiante",
    status: "active",
    dto: buildTransferRejectedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      itemName: "Pack 8 clases",
      amountFormatted: "$48.000 CLP",
      reason: "El monto recibido no coincide con el pack seleccionado (faltan $5.000)",
      contactEmail: ADMIN_EMAIL,
      tiendaUrl: `${BASE}/panel/tienda`,
      branding: B,
    }),
  },
  {
    slug: "12-lesson-unlocked",
    title: "Clase on-demand desbloqueada",
    trigger: "app/api/on-demand/unlock/route.ts",
    recipient: "Estudiante on-demand",
    status: "active",
    dto: buildLessonUnlockedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      lessonTitle: "Apertura de cadera 30 min",
      practiceName: "Yin Yoga",
      categoryName: "Yin",
      remainingLessons: 3,
      onDemandUrl: `${BASE}/panel/biblioteca/yin/apertura-cadera`,
      preferencesUrl: `${BASE}/panel/mi-perfil?tab=correos`,
      branding: B,
    }),
  },
  {
    slug: "13-quota-exhausted",
    title: "Cuota on-demand agotada",
    trigger: "app/api/on-demand/unlock/route.ts",
    recipient: "Estudiante on-demand",
    status: "active",
    dto: buildQuotaExhaustedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      categoryName: "Yin",
      storeUrl: `${BASE}/panel/tienda`,
      preferencesUrl: `${BASE}/panel/mi-perfil?tab=correos`,
      branding: B,
    }),
  },
  {
    slug: "14-new-content",
    title: "Nuevo contenido on-demand",
    trigger: "app/api/panel/on-demand/notify/route.ts — admin publica",
    recipient: "Suscriptores on-demand",
    status: "active",
    dto: buildNewContentEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      lessonTitle: "Pranayama matutino — 15 min",
      practiceName: "Respiración",
      catalogUrl: `${BASE}/panel/biblioteca`,
      preferencesUrl: `${BASE}/panel/mi-perfil?tab=correos`,
      branding: B,
    }),
  },
  // ─── Antes orphans, ahora wired ─────────────────────────────────────────────
  {
    slug: "15-class-reminder",
    title: "Recordatorio antes de clase",
    trigger: "/api/cron/class-reminder — cada hora, 2h antes",
    recipient: "Estudiante con reserva confirmada",
    status: "active",
    dto: buildClassReminderEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      className: "Hatha Yoga Nivel Intermedio",
      startAt: START,
      endAt: END,
      location: "Av. O'Higgins 555, Pucón",
      hoursBefore: 2,
      branding: B,
    }),
  },
  {
    slug: "16-trial-class-teacher",
    title: "Aviso a profesor por clase de prueba",
    trigger: "lib/application/reserve-class.ts — cuando isTrialClass",
    recipient: "Profesor / contactEmail del centro",
    status: "active",
    dto: buildTrialClassNoticeToTeacherEmail({
      toEmail: TEACHER_EMAIL,
      teacherName: "Andrea Martínez",
      studentName: STUDENT,
      studentEmail: STUDENT_EMAIL,
      className: "Hatha Yoga Nivel Inicial",
      startAt: START,
      endAt: END,
      location: "Av. O'Higgins 555, Pucón",
      branding: B,
    }),
  },
  {
    slug: "17-payment-failed",
    title: "Pago fallido (MP rejected)",
    trigger: "lib/application/checkout.ts — webhook MP rejected",
    recipient: "Estudiante",
    status: "active",
    dto: buildPaymentFailedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      productName: "Mensualidad libre",
      retryPaymentUrl: `${BASE}/panel/tienda`,
      branding: B,
    }),
  },
  {
    slug: "18-subscription-confirmed",
    title: "Suscripción activa",
    trigger: "process-subscription-webhook.ts — handleFirstAuthorizedPayment",
    recipient: "Estudiante con suscripción",
    status: "active",
    dto: buildSubscriptionConfirmedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      planName: "Mensualidad libre",
      amountFormatted: "$32.000 CLP",
      nextChargeDate: "12 de junio de 2026",
      branding: B,
    }),
  },
  {
    slug: "19-subscription-renewal",
    title: "Cobro de suscripción renovada",
    trigger: "process-subscription-webhook.ts — processAuthorizedPayment",
    recipient: "Estudiante con suscripción",
    status: "active",
    dto: buildSubscriptionRenewalEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      planName: "Mensualidad libre",
      amountFormatted: "$32.000 CLP",
      nextChargeDate: "12 de julio de 2026",
      branding: B,
    }),
  },
  {
    slug: "20-subscription-cancelled",
    title: "Suscripción cancelada",
    trigger: "process-subscription-webhook.ts — preapproval CANCELLED",
    recipient: "Estudiante que canceló",
    status: "active",
    dto: buildSubscriptionCancelledEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      planName: "Mensualidad libre",
      accessUntil: "30 de mayo de 2026",
      branding: B,
    }),
  },
  {
    slug: "21-event-ticket",
    title: "Confirmación de entrada a evento",
    trigger: "event-checkout (free) + admin manual ticket + approve transfer",
    recipient: "Comprador de entrada",
    status: "active",
    dto: buildEventTicketConfirmationEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      eventTitle: "Retiro de fin de semana — Cordillera",
      startsAt: new Date("2026-06-20T09:00:00-04:00"),
      endsAt: new Date("2026-06-21T17:00:00-04:00"),
      location: "Centro de retiros Pucón",
      amountCents: 18000000,
      currency: "CLP",
      eventUrl: `${BASE}/eventos/retiro-cordillera`,
      preferencesUrl: `${BASE}/panel/mi-perfil?tab=correos`,
      branding: B,
    }),
  },
  // ─── Waitlist: cupo liberado en clase ──────────────────────────────────────
  {
    slug: "22-spot-freed-class",
    title: "Cupo liberado en clase (waitlist)",
    trigger: "Cancelación de Reservation a tiempo en lib/application/reserve-class.ts",
    recipient: "Estudiantes en lista de espera (broadcast)",
    status: "active",
    dto: buildSpotFreedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      itemKind: "class",
      itemName: "Vinyasa Flow",
      startAt: START,
      endAt: END,
      location: "Av. O'Higgins 555, Pucón",
      bookUrl: `${BASE}/panel/reservas?openClass=abc123&fromWaitlist=1`,
      ctaLabel: "Reservar ahora",
      branding: B,
    }),
  },
  // ─── Waitlist: cupo liberado en evento ─────────────────────────────────────
  {
    slug: "23-spot-freed-event",
    title: "Cupo liberado en evento (waitlist)",
    trigger: "Cancelación/refund de EventTicket en lib/application/reject-transfer-order.ts",
    recipient: "Estudiantes en lista de espera de evento (broadcast)",
    status: "active",
    dto: buildSpotFreedEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      itemKind: "event",
      itemName: "Retiro de invierno",
      startAt: START,
      location: "Centro Cuerpo Raíz",
      bookUrl: `${BASE}/panel/eventos/ev_42`,
      ctaLabel: "Ir al pago",
      branding: B,
    }),
  },
  // ─── Waitlist: clase cancelada (a la cola) ─────────────────────────────────
  {
    slug: "24-waitlist-class-cancelled",
    title: "Clase cancelada (waitlist)",
    trigger: "batchCancelLiveClasses en app/panel/horarios/actions.ts",
    recipient: "Estudiantes en lista de espera de la clase cancelada",
    status: "active",
    dto: buildWaitlistClassCancelledEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      className: "Vinyasa Flow",
      startAt: START,
      location: "Av. O'Higgins 555, Pucón",
      branding: B,
    }),
  },
  // ─── Demo de branding alterno: mismo correo con paleta distinta ────────────
  {
    slug: "99-branding-demo-trinidad",
    title: "[Demo] Mismo correo con branding alterno (Trinidad)",
    trigger: "Demuestra que el branding del centro se aplica automáticamente",
    recipient: "Estudiante",
    status: "active",
    dto: buildReservationConfirmationEmail({
      toEmail: STUDENT_EMAIL,
      userName: STUDENT,
      className: "Hatha Yoga Nivel Intermedio",
      startAt: START,
      endAt: END,
      location: "Las Condes 1234, Santiago",
      myReservationsUrl: `${BASE}/panel/reservas`,
      branding: BRAND_TRINIDAD,
    }),
  },
];

const OUT_DIR = join(process.cwd(), "tmp", "email-previews");
mkdirSync(OUT_DIR, { recursive: true });

for (const e of entries) {
  writeFileSync(join(OUT_DIR, `${e.slug}.html`), e.dto.html, "utf8");
}

const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Catastro de correos — Cuerpo Raíz</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f0e9; color: #2D3B2A; margin: 0; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p.lede { color: #5C5A56; margin: 0 0 24px; max-width: 800px; }
    table { width: 100%; max-width: 1200px; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.05); }
    th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
    th { background: #2D3B2A; color: white; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    tr:last-child td { border-bottom: none; }
    code { background: #F5F0E9; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge.active { background: #d4f1d4; color: #1b6b1b; }
    .badge.orphan { background: #ffe0d0; color: #B85C38; }
    a.email-link { color: #B85C38; font-weight: 600; text-decoration: none; }
    a.email-link:hover { text-decoration: underline; }
    .preview-section { margin-top: 48px; }
    .preview-card { background: white; border-radius: 12px; margin-bottom: 32px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.05); }
    .preview-header { padding: 16px 20px; background: #2D3B2A; color: white; }
    .preview-header h2 { margin: 0; font-size: 16px; }
    .preview-header .meta { font-size: 12px; opacity: .85; margin-top: 4px; }
    iframe { width: 100%; min-height: 720px; border: none; display: block; background: #F5F0E9; }
  </style>
</head>
<body>
  <h1>Catastro de correos transaccionales</h1>
  <p class="lede">${entries.length} correos · ${entries.filter((e) => e.status === "active").length} con gatillo · ${entries.filter((e) => e.status === "orphan").length} pendiente · branding aplicado por centro (logo + colores + contacto). Los datos de fechas usan la TZ del centro (<code>America/Santiago</code> en este mock).</p>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Correo</th>
        <th>Asunto</th>
        <th>Destinatario</th>
        <th>Gatillo</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><a class="email-link" href="#${e.slug}">${e.title}</a></td>
        <td><code>${e.dto.subject}</code></td>
        <td>${e.recipient}</td>
        <td><code>${e.trigger}</code></td>
        <td><span class="badge ${e.status}">${e.status === "active" ? "ACTIVO" : "PENDIENTE"}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="preview-section">
    ${entries.map((e) => `
    <div class="preview-card" id="${e.slug}">
      <div class="preview-header">
        <h2>${e.title} <span class="badge ${e.status}" style="margin-left: 8px;">${e.status === "active" ? "ACTIVO" : "PENDIENTE"}</span></h2>
        <div class="meta"><strong>Asunto:</strong> ${e.dto.subject} &nbsp;·&nbsp; <strong>Para:</strong> ${e.dto.to.join(", ")} &nbsp;·&nbsp; <strong>Gatillo:</strong> ${e.trigger}</div>
      </div>
      <iframe srcdoc="${e.dto.html.replace(/"/g, "&quot;")}" title="${e.title}"></iframe>
    </div>`).join("")}
  </div>
</body>
</html>`;

writeFileSync(join(OUT_DIR, "index.html"), indexHtml, "utf8");

console.log(`✓ ${entries.length} correos renderizados en ${OUT_DIR}`);
console.log(`  → abrí ${join(OUT_DIR, "index.html")} en el browser`);
