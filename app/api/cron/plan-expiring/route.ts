import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildPlanExpiringEmail } from "@/lib/email";
import { shouldSendEmail } from "@/lib/application/check-email-preference";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sixDays = new Date(now);
  sixDays.setDate(sixDays.getDate() + 6);
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const expiringPlans = await prisma.userPlan.findMany({
    where: {
      status: "ACTIVE",
      validUntil: { gte: sixDays, lte: sevenDays },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: { select: { name: true } },
      center: { select: { id: true, name: true } },
    },
  });

  let sent = 0;
  const baseUrl = process.env.NEXTAUTH_URL ?? "";

  for (const up of expiringPlans) {
    const canSend = await shouldSendEmail(up.userId, up.centerId, "planExpiring");
    if (!canSend) continue;

    const expiryDate = up.validUntil!.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });

    sendEmailSafe(buildPlanExpiringEmail({
      toEmail: up.user.email,
      userName: up.user.name ?? up.user.email.split("@")[0],
      centerName: up.center.name,
      planName: up.plan.name,
      expiryDate,
      tiendaUrl: `${baseUrl}/panel/tienda`,
      preferencesUrl: `${baseUrl}/panel/mi-perfil?tab=correos`,
    }));
    sent++;
  }

  return NextResponse.json({ ok: true, sent, total: expiringPlans.length });
}
