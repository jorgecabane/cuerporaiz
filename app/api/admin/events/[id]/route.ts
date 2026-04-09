import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { eventRepository } from "@/lib/adapters/db";
import { z } from "zod";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  location: z.string().nullish(),
  imageUrl: z.string().url().nullish(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  amountCents: z.number().int().min(0).optional(),
  currency: z.string().min(1).optional(),
  maxCapacity: z.number().int().min(1).nullish(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  color: z.string().nullish(),
});

/**
 * GET /api/admin/events/[id] — Obtener evento por ID (solo admin).
 */
export async function GET(
  _request: Request,
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
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (err) {
    console.error("[admin events GET by id]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/events/[id] — Actualizar evento (solo admin).
 */
export async function PATCH(
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
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await eventRepository.update(id, session.user.centerId, {
      ...parsed.data,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
    });
    if (!updated) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin events PATCH]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/events/[id] — Eliminar evento (solo admin).
 */
export async function DELETE(
  _request: Request,
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
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const deleted = await eventRepository.delete(id, session.user.centerId);
    if (!deleted) {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[admin events DELETE]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
