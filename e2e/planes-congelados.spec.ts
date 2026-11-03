import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  seedTier1StudentWithActivePlan,
  seedTier2PendingSubscription,
  setUserPlanFreezeDates,
  getUserPlanState,
  linkUserPlanToSubscription,
  cleanupTier2Subscription,
  cleanupTier1UsersByEmailPrefix,
  cleanupPlans,
} from "./helpers/cleanup";

/**
 * Congelar corre la fecha de término lo que duró el congelamiento, el cron descongela
 * solo al llegar la fecha, y los planes de suscripción no se congelan (MP seguiría cobrando).
 * Corre como admin (storageState por defecto).
 */
test.describe("Planes congelados", () => {
  test.describe.configure({ mode: "serial" });

  const DAY = 86_400_000;
  const runId = Date.now().toString(36);
  const emailPrefix = "plan-congelado-e2e-";
  const planName = `E2E Congelado ${runId}`;
  const subPlanName = `E2E Congelado Sub ${runId}`;
  let mpSubscriptionId: string | null = null;

  async function seedPlan(n: number) {
    return seedTier1StudentWithActivePlan({
      centerSlug: "e2e-test",
      email: `${emailPrefix}${n}-${runId}@e2e.test`,
      planName,
    });
  }

  async function freeze(request: APIRequestContext, userPlanId: string, frozenUntil?: string) {
    return request.patch(`/api/admin/user-plans/${userPlanId}`, {
      data: { action: "freeze", reason: "Viaje", ...(frozenUntil ? { frozenUntil } : {}) },
    });
  }

  test.afterAll(async () => {
    if (mpSubscriptionId) await cleanupTier2Subscription(mpSubscriptionId);
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
    await cleanupPlans(planName);
    await cleanupPlans(subPlanName);
  });

  test("descongelar a mano corre la fecha de término", async ({ page, request }) => {
    const seed = await seedPlan(1);
    test.skip(!seed, "Seed no disponible (sin DB en este worker)");
    const before = (await getUserPlanState(seed!.userPlanId))!.validUntil!;

    // "Hasta" en la zona del centro (el server de e2e corre en UTC).
    await page.goto(`/panel/clientes/${seed!.userId}`);
    const hasta = before.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
    await expect(page.getByText(`Hasta: ${hasta}`)).toBeVisible({ timeout: 15000 });

    expect((await freeze(request, seed!.userPlanId)).status()).toBe(200);
    await setUserPlanFreezeDates(seed!.userPlanId, { frozenAt: new Date(Date.now() - 5 * DAY), frozenUntil: null });

    const res = await request.patch(`/api/admin/user-plans/${seed!.userPlanId}`, { data: { action: "unfreeze" } });
    expect(res.status()).toBe(200);

    const after = (await getUserPlanState(seed!.userPlanId))!;
    expect(after.status).toBe("ACTIVE");
    const shiftDays = (after.validUntil!.getTime() - before.getTime()) / DAY;
    expect(shiftDays).toBeGreaterThan(4.99);
    expect(shiftDays).toBeLessThan(5.01);
  });

  test("el cron descongela al llegar la fecha y corre el término", async ({ request }) => {
    const due = await seedPlan(2);
    const notYet = await seedPlan(3);
    test.skip(!due || !notYet, "Seed no disponible (sin DB en este worker)");
    const before = (await getUserPlanState(due!.userPlanId))!.validUntil!;

    expect((await freeze(request, due!.userPlanId)).status()).toBe(200);
    expect((await freeze(request, notYet!.userPlanId)).status()).toBe(200);
    await setUserPlanFreezeDates(due!.userPlanId, { frozenAt: new Date(Date.now() - 3 * DAY), frozenUntil: new Date(Date.now() - 60_000) });
    await setUserPlanFreezeDates(notYet!.userPlanId, { frozenAt: new Date(), frozenUntil: new Date(Date.now() + 2 * DAY) });

    const res = await request.get("/api/cron/plan-unfreeze", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(res.status()).toBe(200);

    const after = (await getUserPlanState(due!.userPlanId))!;
    expect(after.status).toBe("ACTIVE");
    const shiftDays = (after.validUntil!.getTime() - before.getTime()) / DAY;
    expect(shiftDays).toBeGreaterThan(2.99);
    expect(shiftDays).toBeLessThan(3.01);
    expect((await getUserPlanState(notYet!.userPlanId))!.status).toBe("FROZEN");
  });

  test("el cron rechaza llamadas sin el secreto", async ({ request }) => {
    expect((await request.get("/api/cron/plan-unfreeze")).status()).toBe(401);
  });

  test("un plan de suscripción no se puede congelar", async ({ request }) => {
    const seed = await seedPlan(4);
    test.skip(!seed, "Seed no disponible (sin DB en este worker)");
    const sub = await seedTier2PendingSubscription({
      centerSlug: "e2e-test",
      userEmail: `${emailPrefix}4-${runId}@e2e.test`,
      planName: subPlanName,
    });
    test.skip(!sub, "Seed de suscripción no disponible");
    mpSubscriptionId = sub!.mpSubscriptionId;
    await linkUserPlanToSubscription(seed!.userPlanId, sub!.subscriptionId);

    const res = await freeze(request, seed!.userPlanId);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/suscripción/);
    expect((await getUserPlanState(seed!.userPlanId))!.status).toBe("ACTIVE");
  });
});
