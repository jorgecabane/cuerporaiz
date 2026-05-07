import { test, expect } from "@playwright/test";
import {
  seedTier2PendingSubscription,
  cleanupTier2Subscription,
  cleanupPlans,
  getTier2SubscriptionStatus,
  getTier2UserPlanForSubscription,
} from "./helpers/cleanup";

/**
 * E2E para los webhooks de Subscription recurrente de MercadoPago.
 *
 * Como el webhook real (`/api/webhooks/mercadopago/[centerId]`) consulta la
 * API de MP (`getPreapproval`, `getAuthorizedPayment`), no se puede ejecutar
 * en E2E sin tokens reales. En vez de eso, este spec golpea un endpoint de
 * TEST (`/api/e2e-test/sub-webhook-fire`) que reproduce la misma lógica
 * interna de `process-subscription-webhook.ts` con datos simulados.
 *
 * Lo que sí cubrimos end-to-end es la consecuencia en DB:
 *  - Subscription PENDING → ACTIVE en preapproval `authorized`.
 *  - UserPlan se crea al primer authorized_payment `approved`.
 */
test.describe("Subscription webhook — preapproval + authorized_payment", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let planName: string;
  let seed: Awaited<ReturnType<typeof seedTier2PendingSubscription>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    planName = `E2E SubWebhook ${runId}`;
    seed = await seedTier2PendingSubscription({
      centerSlug: "e2e-test",
      userEmail: "admin@e2e.test",
      planName,
    });
  });

  test.afterAll(async () => {
    if (seed) {
      await cleanupTier2Subscription(seed.mpSubscriptionId);
    }
    await cleanupPlans(planName);
  });

  test("preapproval authorized → Subscription pasa a ACTIVE", async ({ request }) => {
    test.skip(!seed, "Sin DB en este worker");

    const res = await request.post("/api/e2e-test/sub-webhook-fire", {
      data: {
        type: "preapproval",
        mpSubscriptionId: seed!.mpSubscriptionId,
        mpStatus: "authorized",
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.newStatus).toBe("ACTIVE");

    // Verificación end-to-end: la Subscription quedó ACTIVE en DB.
    const status = await getTier2SubscriptionStatus(seed!.mpSubscriptionId);
    expect(status).toBe("ACTIVE");
  });

  test("authorized_payment approved → crea UserPlan ACTIVE para el período", async ({ request }) => {
    test.skip(!seed, "Sin DB en este worker");

    const res = await request.post("/api/e2e-test/sub-webhook-fire", {
      data: {
        type: "authorized_payment",
        mpSubscriptionId: seed!.mpSubscriptionId,
        mpPaymentStatus: "approved",
        transactionAmount: 19900,
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.userPlanId).toBeTruthy();

    const userPlan = await getTier2UserPlanForSubscription(seed!.subscriptionId);
    expect(userPlan).toBeTruthy();
    expect(userPlan?.status).toBe("ACTIVE");
    expect(userPlan?.paymentStatus).toBe("PAID");
    expect(userPlan?.planId).toBe(seed!.planId);
  });

  test("authorized_payment rejected → Subscription pasa a PAYMENT_FAILED", async ({ request }) => {
    test.skip(!seed, "Sin DB en este worker");

    const res = await request.post("/api/e2e-test/sub-webhook-fire", {
      data: {
        type: "authorized_payment",
        mpSubscriptionId: seed!.mpSubscriptionId,
        mpPaymentStatus: "rejected",
      },
    });
    expect(res.ok()).toBeTruthy();

    const status = await getTier2SubscriptionStatus(seed!.mpSubscriptionId);
    expect(status).toBe("PAYMENT_FAILED");
  });
});
