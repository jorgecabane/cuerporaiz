/**
 * Caso de uso: la alumna confirma que ya transfirió.
 * Marca la Order/EventTicket como pendiente de aprobación admin.
 *
 * Validaciones:
 * - El centro tiene transferencia activa para el tipo (plan/evento).
 * - Si el centro exige comprobante, debe venir el receiptDocId de Sanity.
 * - El recurso pertenece al usuario y está PENDING sin claim previo.
 * - Para eventos: chequeo de cupo dentro de transacción (si está lleno → error).
 *
 * Tras commit dispara mail "Recibimos tu transferencia" (no bloqueante).
 */
import { prisma } from "@/lib/adapters/db/prisma";
import { centerRepository, planRepository, eventRepository, userRepository } from "@/lib/adapters/db";
import { sendEmailSafe } from "./send-email";
import { buildTransferReceivedEmail } from "@/lib/email";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";

export type ClaimTransferErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "ALREADY_CLAIMED"
  | "TRANSFER_DISABLED_FOR_TYPE"
  | "RECEIPT_REQUIRED"
  | "INVALID_STATE"
  | "EVENT_FULL";

export type ClaimTransferResult =
  | { success: true; redirectTo: string }
  | { success: false; code: ClaimTransferErrorCode; message: string };

export interface ClaimTransferForOrderInput {
  orderId: string;
  userId: string;
  receiptDocId: string | null;
}

export async function claimTransferForOrder(
  input: ClaimTransferForOrderInput,
): Promise<ClaimTransferResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      userId: true,
      centerId: true,
      planId: true,
      amountCents: true,
      currency: true,
      status: true,
      paymentMethod: true,
      transferClaimedAt: true,
    },
  });
  if (!order) {
    return { success: false, code: "NOT_FOUND", message: "Orden no encontrada" };
  }
  if (order.userId !== input.userId) {
    return { success: false, code: "FORBIDDEN", message: "Esta orden no es tuya" };
  }
  if (order.status !== "PENDING") {
    return { success: false, code: "INVALID_STATE", message: "Esta orden ya no admite cambios" };
  }
  if (order.transferClaimedAt) {
    return { success: false, code: "ALREADY_CLAIMED", message: "Ya marcaste esta transferencia" };
  }

  const center = await centerRepository.findById(order.centerId);
  if (!center) {
    return { success: false, code: "NOT_FOUND", message: "Centro no encontrado" };
  }
  if (!center.bankTransferEnabled || !center.bankTransferAcceptPlans) {
    return {
      success: false,
      code: "TRANSFER_DISABLED_FOR_TYPE",
      message: "El centro no acepta pagos por transferencia para planes",
    };
  }
  if (center.bankTransferRequireReceipt && !input.receiptDocId) {
    return {
      success: false,
      code: "RECEIPT_REQUIRED",
      message: "Tienes que adjuntar el comprobante",
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: "TRANSFER",
      transferClaimedAt: new Date(),
      transferReceiptSanityId: input.receiptDocId,
    },
  });

  // Mail informativo no bloqueante.
  const [buyer, plan] = await Promise.all([
    userRepository.findById(input.userId),
    planRepository.findById(order.planId),
  ]);
  if (buyer && plan) {
    const branding = await getEmailBranding(center.id);
    sendEmailSafe(
      buildTransferReceivedEmail({
        toEmail: buyer.email,
        userName: buyer.name ?? buyer.email.split("@")[0],
        itemName: plan.name,
        amountFormatted: `$${order.amountCents.toLocaleString("es-CL")}`,
        misPagosUrl: `${getBaseUrl()}/panel/mis-pagos`,
        branding,
      }),
    );
  }

  return { success: true, redirectTo: `/panel/mis-pagos?recien=${order.id}` };
}

export interface ClaimTransferForEventTicketInput {
  ticketId: string;
  userId: string;
  receiptDocId: string | null;
}

export async function claimTransferForEventTicket(
  input: ClaimTransferForEventTicketInput,
): Promise<ClaimTransferResult> {
  // Cupo + claim en transacción para evitar race conditions.
  const ticket = await prisma.eventTicket.findUnique({
    where: { id: input.ticketId },
    include: { event: { select: { id: true, centerId: true, maxCapacity: true, title: true } } },
  });
  if (!ticket) {
    return { success: false, code: "NOT_FOUND", message: "Ticket no encontrado" };
  }
  if (ticket.userId !== input.userId) {
    return { success: false, code: "FORBIDDEN", message: "Este ticket no es tuyo" };
  }
  if (ticket.status !== "PENDING") {
    return { success: false, code: "INVALID_STATE", message: "Este ticket ya no admite cambios" };
  }
  if (ticket.transferClaimedAt) {
    return { success: false, code: "ALREADY_CLAIMED", message: "Ya marcaste esta transferencia" };
  }

  const center = await centerRepository.findById(ticket.event.centerId);
  if (!center) {
    return { success: false, code: "NOT_FOUND", message: "Centro no encontrado" };
  }
  if (!center.bankTransferEnabled || !center.bankTransferAcceptEvents) {
    return {
      success: false,
      code: "TRANSFER_DISABLED_FOR_TYPE",
      message: "El centro no acepta pagos por transferencia para eventos",
    };
  }
  if (center.bankTransferRequireReceipt && !input.receiptDocId) {
    return {
      success: false,
      code: "RECEIPT_REQUIRED",
      message: "Tienes que adjuntar el comprobante",
    };
  }

  // Transacción: re-chequear cupo (otros pueden haber pagado MP entremedio) y claimar.
  try {
    await prisma.$transaction(async (tx) => {
      if (ticket.event.maxCapacity !== null) {
        // Sumamos cupos vivos: PAID + PENDING con transferencia claimed (ocupan cupo).
        const occupying = await tx.eventTicket.aggregate({
          where: {
            eventId: ticket.event.id,
            OR: [
              { status: "PAID" },
              {
                status: "PENDING",
                transferClaimedAt: { not: null },
              },
            ],
            NOT: { id: ticket.id },
          },
          _sum: { quantity: true },
        });
        const seatsTaken = occupying._sum.quantity ?? 0;
        if (seatsTaken + ticket.quantity > ticket.event.maxCapacity) {
          throw new Error("EVENT_FULL");
        }
      }
      await tx.eventTicket.update({
        where: { id: ticket.id },
        data: {
          paymentMethod: "TRANSFER",
          transferClaimedAt: new Date(),
          transferReceiptSanityId: input.receiptDocId,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EVENT_FULL") {
      return {
        success: false,
        code: "EVENT_FULL",
        message: "Se acabaron los cupos mientras transferías. No transfieras.",
      };
    }
    throw e;
  }

  const [buyer, eventDoc] = await Promise.all([
    userRepository.findById(input.userId),
    eventRepository.findById(ticket.event.id),
  ]);
  if (buyer && eventDoc) {
    const branding = await getEmailBranding(center.id);
    sendEmailSafe(
      buildTransferReceivedEmail({
        toEmail: buyer.email,
        userName: buyer.name ?? buyer.email.split("@")[0],
        itemName: eventDoc.title,
        amountFormatted: `$${ticket.amountCents.toLocaleString("es-CL")}`,
        misPagosUrl: `${getBaseUrl()}/panel/mis-pagos`,
        branding,
      }),
    );
  }

  return { success: true, redirectTo: `/panel/mis-pagos?recien=ticket-${ticket.id}` };
}
