import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUserTrialEligible } from "@/lib/application/reserve-class";

/**
 * Indica si el usuario puede tomar una clase de prueba en su centro.
 * Mirror de los checks server-side que hace reserveClassUseCase. Usado por la
 * UI antes de mostrar el modal de confirmación de clase de prueba, para
 * decidir si ofrecer "quemar tu trial" o "necesitas un plan".
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json({ eligible: false });
    }
    const eligible = await isUserTrialEligible(session.user.id, session.user.centerId);
    return NextResponse.json({ eligible });
  } catch (err) {
    console.error("[reservations trial-eligibility]", err);
    return NextResponse.json({ eligible: false });
  }
}
