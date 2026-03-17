import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canShowTrialCta } from "@/lib/application/reserve-class";

/**
 * Indica si el usuario debe ver el CTA de clase de prueba gratis.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ showTrialCta: false });
    }
    const showTrialCta = await canShowTrialCta(session.user.id, session.user.centerId);
    return NextResponse.json({ showTrialCta });
  } catch (err) {
    console.error("[reservations can-show-trial-cta]", err);
    return NextResponse.json({ showTrialCta: false });
  }
}
