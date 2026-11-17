import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildPlanExpiringEmail } from "@/lib/email";
import { shouldSendEmail } from "@/lib/application/check-email-preference";
import { getEmailBranding } from "@/lib/email/branding";
import { formatLongDate } from "@/lib/email/format-datetime";
import { getBaseUrl } from "@/lib/utils/base-url";
import { shouldSendExpiringNotice } from "@/lib/domain/user-plan";
import { MAX_PLAN_EXPIRING_NOTICE_DAYS } from "@/lib/domain/center-policy";
import { isCronAuthorized } from "@/lib/utils/cron-auth";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // +1 día de holgura: se compara por fecha civil en la zona del centro.
  const maxWindow = new Date(now.getTime() + (MAX_PLAN_EXPIRING_NOTICE_DAYS + 1) * 86_400_000);

  // Candidatos amplios; cada centro define con cuántos días avisar (Center.planExpiringNoticeDays).
  const candidates = await prisma.userPlan.findMany({
    where: {
      status: "ACTIVE",
      validUntil: { gte: now, lte: maxWindow },
      subscriptionId: null,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: { select: { name: true } },
      center: { select: { id: true, name: true, planExpiringNoticeDays: true, timezone: true } },
    },
  });
  const expiringPlans = candidates.filter((up) =>
    shouldSendExpiringNotice(up, now, up.center.planExpiringNoticeDays, up.center.timezone)
  );

  let sent = 0;
  const baseUrl = getBaseUrl();

  for (const up of expiringPlans) {
    const canSend = await shouldSendEmail(up.userId, up.centerId, "planExpiring");
    if (!canSend) continue;

    const branding = await getEmailBranding(up.centerId);
    const expiryDate = formatLongDate(up.validUntil!, branding.timezone);

    sendEmailSafe(buildPlanExpiringEmail({
      toEmail: up.user.email,
      userName: up.user.name ?? up.user.email.split("@")[0],
      planName: up.plan.name,
      expiryDate,
      tiendaUrl: `${baseUrl}/panel/tienda`,
      preferencesUrl: `${baseUrl}/panel/mi-perfil?tab=correos`,
      branding,
    }));
    sent++;
  }

  return NextResponse.json({ ok: true, sent, total: expiringPlans.length });
}
