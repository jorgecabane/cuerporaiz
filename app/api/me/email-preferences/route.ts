import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { emailPreferenceRepository } from "@/lib/adapters/db";
import { updateEmailPreferencesSchema } from "@/lib/dto/profile-dto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const prefs = await emailPreferenceRepository.findByUserAndCenter(
    session.user.id,
    session.user.centerId
  );

  // If no record, return all defaults (true)
  return NextResponse.json(prefs ?? {
    classReminder: true,
    spotFreed: true,
    planExpiring: true,
    reservationConfirm: true,
    purchaseConfirm: true,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = updateEmailPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const result = await emailPreferenceRepository.upsert({
    userId: session.user.id,
    centerId: session.user.centerId,
    ...parsed.data,
  });

  return NextResponse.json(result);
}
