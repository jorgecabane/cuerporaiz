"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { orderRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { isAdminRole } from "@/lib/domain";
import { activatePlanForOrder } from "@/lib/application/activate-plan";
import {
  rejectTransferOrder,
  rejectTransferEventTicket,
} from "@/lib/application/reject-transfer-order";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

const METHODS = ["transfer", "cash", "other"] as const;

export async function approveOrderManually(formData: FormData): Promise<void> {
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) redirect("/panel/pagos");
  const methodRaw = formData.get("method");
  const method = typeof methodRaw === "string" && METHODS.includes(methodRaw as (typeof METHODS)[number])
    ? (methodRaw as (typeof METHODS)[number])
    : "transfer";
  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  const centerId = await requireAdminCenterId();
  const order = await orderRepository.findById(orderId.trim());
  if (!order || order.centerId !== centerId || order.status !== "PENDING")
    redirect("/panel/pagos");

  await orderRepository.updateStatus(orderId.trim(), "APPROVED");
  const result = await activatePlanForOrder(order.id, order.userId, order.planId, order.centerId);
  if (result.success && result.userPlan) {
    await prisma.manualPayment.create({
      data: {
        centerId,
        userId: order.userId,
        userPlanId: result.userPlan.id,
        amountCents: order.amountCents,
        currency: order.currency,
        method,
        note,
        receiptSanityId: order.transferReceiptSanityId ?? null,
      },
    });
  }
  redirect("/panel/pagos");
}

/**
 * Aprueba un EventTicket pagado por transferencia: lo marca como PAID,
 * registra el ManualPayment con el comprobante (si lo hay) y libera la
 * confirmación al estudiante (mail estándar de "purchase confirmed" se
 * dispara desde un punto separado del sistema; para tickets, por ahora
 * sólo confirmamos el cupo).
 */
export async function approveEventTicketManually(formData: FormData): Promise<void> {
  const ticketId = formData.get("ticketId");
  if (typeof ticketId !== "string" || !ticketId.trim()) redirect("/panel/pagos");
  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  const centerId = await requireAdminCenterId();
  const ticket = await prisma.eventTicket.findUnique({
    where: { id: ticketId.trim() },
    include: { event: { select: { centerId: true, maxCapacity: true } } },
  });
  if (!ticket || ticket.event.centerId !== centerId || ticket.status !== "PENDING") {
    redirect("/panel/pagos");
  }

  // Re-chequear cupo por si se llenó mientras esta transferencia esperaba
  if (ticket.event.maxCapacity !== null) {
    const occupying = await prisma.eventTicket.count({
      where: {
        eventId: ticket.eventId,
        OR: [
          { status: "PAID" },
          { status: "PENDING", transferClaimedAt: { not: null } },
        ],
        NOT: { id: ticket.id },
      },
    });
    if (occupying >= ticket.event.maxCapacity) {
      redirect("/panel/pagos?error=event-full");
    }
  }

  await prisma.eventTicket.update({
    where: { id: ticket.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  await prisma.manualPayment.create({
    data: {
      centerId,
      userId: ticket.userId,
      eventTicketId: ticket.id,
      amountCents: ticket.amountCents,
      currency: ticket.currency,
      method: "transfer",
      note,
      receiptSanityId: ticket.transferReceiptSanityId ?? null,
    },
  });

  redirect("/panel/pagos");
}

export async function rejectTransferOrderAction(formData: FormData): Promise<void> {
  const orderId = formData.get("orderId");
  const reason = formData.get("reason");
  if (typeof orderId !== "string" || !orderId.trim()) redirect("/panel/pagos");
  if (typeof reason !== "string") redirect("/panel/pagos");
  const centerId = await requireAdminCenterId();
  await rejectTransferOrder({
    orderId: orderId.trim(),
    reason,
    adminCenterId: centerId,
  });
  redirect("/panel/pagos");
}

export async function rejectTransferEventTicketAction(formData: FormData): Promise<void> {
  const ticketId = formData.get("ticketId");
  const reason = formData.get("reason");
  if (typeof ticketId !== "string" || !ticketId.trim()) redirect("/panel/pagos");
  if (typeof reason !== "string") redirect("/panel/pagos");
  const centerId = await requireAdminCenterId();
  await rejectTransferEventTicket({
    ticketId: ticketId.trim(),
    reason,
    adminCenterId: centerId,
  });
  redirect("/panel/pagos");
}
