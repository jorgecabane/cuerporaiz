import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/db/prisma";
import {
  mapMpStatusToSubscription,
  mapMpStatusToUserPlan,
} from "@/lib/application/process-subscription-webhook";
import { computeValidUntil } from "@/lib/application/activate-plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoint de TEST para simular el procesamiento de un webhook de
 * MercadoPago Preapproval/AuthorizedPayment SIN tocar la API de MP.
 *
 * Reproduce la lógica interna de `processPreapprovalWebhook` y
 * `processAuthorizedPaymentWebhook` (en `lib/application/process-subscription-webhook.ts`)
 * usando datos de "MP" provistos por el cliente del test.
 *
 * Gated por E2E_TEST_ROUTES_ENABLED=1: si no está seteado, retorna 404. El
 * playwright webServer lo activa en local/CI; producción nunca lo expone.
 *
 * Body:
 *  - { type: "preapproval", mpSubscriptionId, mpStatus }
 *  - { type: "authorized_payment", mpSubscriptionId, mpPaymentStatus, transactionAmount? }
 */
export async function POST(request: Request) {
  if (process.env.E2E_TEST_ROUTES_ENABLED !== "1") {
    return NextResponse.json({ error: "test routes disabled" }, { status: 403 });
  }

  let body: {
    type?: string;
    mpSubscriptionId?: string;
    mpStatus?: string;
    mpPaymentStatus?: string;
    transactionAmount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.mpSubscriptionId || !body.type) {
    return NextResponse.json({ error: "mpSubscriptionId and type required" }, { status: 400 });
  }

  if (body.type === "preapproval") {
    const newStatus = mapMpStatusToSubscription(body.mpStatus ?? "pending");
    const sub = await prisma.subscription.findUnique({
      where: { mpSubscriptionId: body.mpSubscriptionId },
    });
    if (!sub) return NextResponse.json({ ok: true, note: "subscription not found" });

    if (sub.status !== newStatus) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: newStatus },
      });

      const activeUserPlan = await prisma.userPlan.findFirst({
        where: {
          subscriptionId: sub.id,
          status: { not: "CANCELLED" },
        },
      });
      if (activeUserPlan) {
        const userPlanStatus = mapMpStatusToUserPlan(newStatus);
        if (userPlanStatus === "FROZEN") {
          await prisma.userPlan.update({
            where: { id: activeUserPlan.id },
            data: {
              status: "FROZEN",
              frozenAt: new Date(),
              freezeReason: `Suscripción ${newStatus.toLowerCase()}`,
            },
          });
        } else if (userPlanStatus === "ACTIVE" && activeUserPlan.status === "FROZEN") {
          await prisma.userPlan.update({
            where: { id: activeUserPlan.id },
            data: { status: "ACTIVE", unfrozenAt: new Date() },
          });
        } else {
          await prisma.userPlan.update({
            where: { id: activeUserPlan.id },
            data: { status: userPlanStatus },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, newStatus });
  }

  if (body.type === "authorized_payment") {
    const sub = await prisma.subscription.findUnique({
      where: { mpSubscriptionId: body.mpSubscriptionId },
    });
    if (!sub) {
      return NextResponse.json({ error: "subscription not found" }, { status: 400 });
    }
    const paymentStatus = body.mpPaymentStatus ?? "approved";
    if (paymentStatus !== "approved") {
      if (paymentStatus === "rejected") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "PAYMENT_FAILED" },
        });
      }
      return NextResponse.json({ ok: true, note: "non-approved payment" });
    }
    const plan = await prisma.plan.findUnique({ where: { id: sub.planId } });
    if (!plan) return NextResponse.json({ error: "plan not found" }, { status: 400 });

    const now = new Date();
    const validUntil =
      computeValidUntil(
        {
          ...plan,
          validityDays: plan.validityDays,
          validityPeriod: plan.validityPeriod,
        } as Parameters<typeof computeValidUntil>[0],
        now,
      ) ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: validUntil,
      },
    });

    const existingUp = await prisma.userPlan.findFirst({
      where: {
        subscriptionId: sub.id,
        status: { not: "CANCELLED" },
      },
    });
    if (existingUp && existingUp.validUntil && existingUp.validUntil >= now) {
      return NextResponse.json({ ok: true, note: "userPlan already valid" });
    }

    const created = await prisma.userPlan.create({
      data: {
        userId: sub.userId,
        planId: plan.id,
        centerId: sub.centerId,
        subscriptionId: sub.id,
        status: "ACTIVE",
        paymentStatus: "PAID",
        classesTotal: plan.maxReservations,
        classesUsed: 0,
        validFrom: now,
        validUntil,
      },
    });

    return NextResponse.json({ ok: true, userPlanId: created.id });
  }

  return NextResponse.json({ error: "unknown type" }, { status: 400 });
}
