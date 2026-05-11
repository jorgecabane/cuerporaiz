import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  waitlistRepository,
  liveClassRepository,
  eventRepository,
  eventTicketRepository,
} from "@/lib/adapters/db";
import { isStaffRole } from "@/lib/domain/role";

/**
 * Admin/instructor quita una entry de la waitlist (forzado).
 * Si la entry tenía hold, también cancela el ticket PENDING asociado.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    if (session.user.role === undefined || !isStaffRole(session.user.role)) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo administración y profesores" },
        { status: 403 }
      );
    }
    const { entryId } = await context.params;
    const entry = await waitlistRepository.findById(entryId);
    if (entry === null) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Entry no encontrada" },
        { status: 404 }
      );
    }
    if (entry.centerId !== session.user.centerId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Entry no pertenece a tu centro" },
        { status: 403 }
      );
    }

    // Valida que el item siga perteneciendo al centro (paranoia).
    if (entry.liveClassId !== null) {
      const lc = await liveClassRepository.findById(entry.liveClassId);
      if (lc !== null && lc.centerId !== session.user.centerId) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Item no pertenece a tu centro" },
          { status: 403 }
        );
      }
    } else if (entry.eventId !== null) {
      const ev = await eventRepository.findById(entry.eventId);
      if (ev !== null && ev.centerId !== session.user.centerId) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Item no pertenece a tu centro" },
          { status: 403 }
        );
      }
      // Si tenía hold, cancela ticket PENDING.
      if (entry.status === "HELD") {
        const ticket = await eventTicketRepository.findByEventAndUser(
          entry.eventId,
          entry.userId
        );
        if (ticket !== null && ticket.status === "PENDING") {
          await eventTicketRepository.updateStatus(ticket.id, "CANCELLED");
        }
      }
    }

    await waitlistRepository.updateStatus(entryId, "CANCELLED");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/waitlist DELETE]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al quitar de la lista" },
      { status: 500 }
    );
  }
}
