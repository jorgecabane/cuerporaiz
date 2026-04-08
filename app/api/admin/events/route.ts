import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { eventRepository } from "@/lib/adapters/db";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  location: z.string().nullish(),
  imageUrl: z.string().url().nullish(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  amountCents: z.number().int().min(0),
  currency: z.string().min(1).optional(),
  maxCapacity: z.number().int().min(1).nullish(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  color: z.string().nullish(),
});

/**
 * GET /api/admin/events — Listar eventos del centro (solo admin).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }

    const events = await eventRepository.findByCenterId(session.user.centerId);
    return NextResponse.json(events);
  } catch (err) {
    console.error("[admin events GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/admin/events — Crear evento (solo admin).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const event = await eventRepository.create(session.user.centerId, {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("[admin events POST]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
