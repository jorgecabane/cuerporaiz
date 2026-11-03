import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import { userPlanRepository } from "@/lib/adapters/db";
import { validUntilAfterFreeze } from "@/lib/domain";

/** Descongela los planes cuya fecha "Descongelar automáticamente el" ya llegó. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.userPlan.findMany({
    where: { status: "FROZEN", frozenUntil: { lte: now } },
    select: { id: true, validUntil: true, frozenAt: true, subscriptionId: true },
  });

  for (const up of due) {
    await userPlanRepository.unfreeze(up.id, validUntilAfterFreeze(up, now));
  }

  return NextResponse.json({ ok: true, unfrozen: due.length });
}
