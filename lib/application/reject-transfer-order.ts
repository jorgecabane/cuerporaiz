/**
 * Caso de uso: el admin rechaza una transferencia pendiente.
 *
 * - Para Order (planes): pasa a CANCELLED + guarda motivo.
 * - Para EventTicket (eventos): pasa a CANCELLED + guarda motivo (libera cupo).
 *
 * Tras commit dispara mail con el motivo literal al estudiante.
 */
import { prisma } from "@/lib/adapters/db/prisma";
import { centerRepository, planRepository, userRepository, siteConfigRepository } from "@/lib/adapters/db";
import { sendEmailSafe } from "./send-email";
import { buildTransferRejectedEmail } from "@/lib/email";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";

const MIN_REASON_LENGTH = 10;
const SUPPORT_FALLBACK = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "cuerporaiztrinidad@gmail.com";

/**
 * Resuelve el email de contacto a mostrar al usuario.
 * Prioridad: bankAccountEmail (plugin transferencia) → site.contactEmail → fallback global.
 */
async function resolveContactEmail(centerId: string, bankAccountEmail: string | null): Promise<string> {
  if (bankAccountEmail) return bankAccountEmail;
  const site = await siteConfigRepository.findByCenterId(centerId);
  return site?.contactEmail ?? SUPPORT_FALLBACK;
}

export type RejectTransferErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "REASON_TOO_SHORT";

export type RejectTransferResult =
  | { success: true }
  | { success: false; code: RejectTransferErrorCode; message: string };

export interface RejectTransferOrderInput {
  orderId: string;
  reason: string;
  adminCenterId: string;
}

export async function rejectTransferOrder(input: RejectTransferOrderInput): Promise<RejectTransferResult> {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return {
      success: false,
      code: "REASON_TOO_SHORT",
      message: `El motivo debe tener al menos ${MIN_REASON_LENGTH} caracteres.`,
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      userId: true,
      centerId: true,
      planId: true,
      amountCents: true,
      status: true,
      paymentMethod: true,
      transferClaimedAt: true,
    },
  });
  if (!order) {
    return { success: false, code: "NOT_FOUND", message: "Orden no encontrada" };
  }
  if (order.centerId !== input.adminCenterId) {
    return { success: false, code: "FORBIDDEN", message: "Esta orden no es de tu centro" };
  }
  if (
    order.status !== "PENDING" ||
    order.paymentMethod !== "TRANSFER" ||
    !order.transferClaimedAt
  ) {
    return {
      success: false,
      code: "INVALID_STATE",
      message: "Esta orden no está pendiente por transferencia",
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      transferRejectedReason: reason,
    },
  });

  const [buyer, plan, center] = await Promise.all([
    userRepository.findById(order.userId),
    planRepository.findById(order.planId),
    centerRepository.findById(order.centerId),
  ]);
  if (buyer && plan && center) {
    const [branding, contactEmail] = await Promise.all([
      getEmailBranding(center.id),
      resolveContactEmail(center.id, center.bankAccountEmail),
    ]);
    sendEmailSafe(
      buildTransferRejectedEmail({
        toEmail: buyer.email,
        userName: buyer.name ?? buyer.email.split("@")[0],
        itemName: plan.name,
        amountFormatted: `$${order.amountCents.toLocaleString("es-CL")}`,
        reason,
        contactEmail,
        tiendaUrl: `${getBaseUrl()}/panel/tienda`,
        branding,
      }),
    );
  }

  return { success: true };
}

export interface RejectTransferEventTicketInput {
  ticketId: string;
  reason: string;
  adminCenterId: string;
}

export async function rejectTransferEventTicket(
  input: RejectTransferEventTicketInput,
): Promise<RejectTransferResult> {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return {
      success: false,
      code: "REASON_TOO_SHORT",
      message: `El motivo debe tener al menos ${MIN_REASON_LENGTH} caracteres.`,
    };
  }

  const ticket = await prisma.eventTicket.findUnique({
    where: { id: input.ticketId },
    include: { event: { select: { centerId: true, title: true } } },
  });
  if (!ticket) {
    return { success: false, code: "NOT_FOUND", message: "Ticket no encontrado" };
  }
  if (ticket.event.centerId !== input.adminCenterId) {
    return { success: false, code: "FORBIDDEN", message: "Este ticket no es de tu centro" };
  }
  if (
    ticket.status !== "PENDING" ||
    ticket.paymentMethod !== "TRANSFER" ||
    !ticket.transferClaimedAt
  ) {
    return {
      success: false,
      code: "INVALID_STATE",
      message: "Este ticket no está pendiente por transferencia",
    };
  }

  await prisma.eventTicket.update({
    where: { id: ticket.id },
    data: {
      status: "CANCELLED",
      transferRejectedReason: reason,
    },
  });

  const [buyer, center] = await Promise.all([
    userRepository.findById(ticket.userId),
    centerRepository.findById(ticket.event.centerId),
  ]);
  if (buyer && center) {
    const [branding, contactEmail] = await Promise.all([
      getEmailBranding(center.id),
      resolveContactEmail(center.id, center.bankAccountEmail),
    ]);
    sendEmailSafe(
      buildTransferRejectedEmail({
        toEmail: buyer.email,
        userName: buyer.name ?? buyer.email.split("@")[0],
        itemName: ticket.event.title,
        amountFormatted: `$${ticket.amountCents.toLocaleString("es-CL")}`,
        reason,
        contactEmail,
        tiendaUrl: `${getBaseUrl()}/panel/eventos`,
        branding,
      }),
    );
  }

  return { success: true };
}
