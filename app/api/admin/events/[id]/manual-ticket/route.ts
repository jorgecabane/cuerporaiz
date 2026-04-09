import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { eventRepository, eventTicketRepository } from "@/lib/adapters/db";
import { z } from "zod";

const manualTicketSchema = z.object({
  userId: z.string().min(1),
});

/**
 * POST /api/admin/events/[id]/manual-ticket — Crear entrada manual para un usuario (solo admin).
 * Crea el ticket directamente como PAID sin pasar por MercadoPago.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const event = await eventRepository.findById(id);
    if (!event || event.centerId !== session.user.centerId) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Evento no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = manualTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    const existing = await eventTicketRepository.findByEventAndUser(event.id, userId);
    if (existing && existing.status === "PAID") {
      return NextResponse.json(
        { code: "ALREADY_PURCHASED", message: "El usuario ya tiene una entrada pagada para este evento" },
        { status: 409 }
      );
    }

    if (event.maxCapacity !== null) {
      const paidCount = await eventTicketRepository.countPaidByEventId(event.id);
      if (paidCount >= event.maxCapacity) {
        return NextResponse.json(
          { code: "EVENT_FULL", message: "El evento está lleno" },
          { status: 409 }
        );
      }
    }

    const ticket = await eventTicketRepository.create({
      eventId: event.id,
      userId,
      amountCents: event.amountCents,
      currency: event.currency,
    });
    const paid = await eventTicketRepository.updateStatus(ticket.id, "PAID", { paidAt: new Date() });

    return NextResponse.json(paid ?? ticket, { status: 201 });
  } catch (err) {
    console.error("[admin events manual-ticket POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
