import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { planRepository, centerRepository } from "@/lib/adapters/db";
import type { Plan } from "@/lib/ports";

/**
 * Lista planes del centro. Si no hay sesión, se puede pasar centerId o centerSlug por query.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const centerIdOrSlug = searchParams.get("centerId") ?? searchParams.get("centerSlug");

    let centerId: string;

    if (centerIdOrSlug) {
      const center = await centerRepository.findBySlug(centerIdOrSlug)
        ?? await centerRepository.findById(centerIdOrSlug);
      if (!center) {
        return NextResponse.json(
          { code: "CENTER_NOT_FOUND", message: "Centro no encontrado" },
          { status: 404 }
        );
      }
      centerId = center.id;
    } else {
      const session = await auth();
      if (!session?.user?.centerId) {
        return NextResponse.json(
          { code: "UNAUTHORIZED", message: "Indica un centro o inicia sesión" },
          { status: 401 }
        );
      }
      centerId = session.user.centerId;
    }

    const plans = await planRepository.findManyByCenterId(centerId);
    return NextResponse.json({
      plans: plans.map((p: Plan) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        amountCents: p.amountCents,
        currency: p.currency,
        type: p.type,
      })),
    });
  } catch (err) {
    console.error("[plans GET]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar planes" },
      { status: 500 }
    );
  }
}
