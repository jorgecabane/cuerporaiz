import { test, expect } from "@playwright/test";
import {
  seedTier2ExpiredUserPlan,
  cleanupTier2UserPlan,
  cleanupPlans,
  seedTier2TrialClass,
  seedTier2ClassWithinBookingWindow,
  cleanupLiveClasses,
  cleanupTier2UserReservations,
  cleanupTier2UserPlansForUser,
  setTier2UserLegacyClient,
} from "./helpers/cleanup";

/**
 * E2E para edge cases de lifecycle de plan:
 *  1. Plan EXPIRED aparece como "Vencido" en /panel/tienda → tab Históricos.
 *  2. Trial class limit: si `allowTrialClassPerPerson=true` (default) y el
 *     usuario ya tiene una reserva de trial, no puede reservar otra.
 *  3. Booking window: si la clase empieza dentro de `bookBeforeMinutes`
 *     (default 1440 = 24h), la reserva es bloqueada con BOOKING_WINDOW_CLOSED.
 *
 * Los tests 2 y 3 se ejecutan vía API (`/api/reservations`) usando la sesión
 * admin (storageState default). El admin tiene rol ADMINISTRATOR pero el
 * use case `reserveClassUseCase` no restringe por rol, así que esto cubre
 * la lógica server-side end-to-end.
 */
const ADMIN_EMAIL = process.env.E2E_USER_EMAIL ?? "admin@e2e.test";

test.describe("Plan lifecycle — EXPIRED + trial limit + booking window", () => {
  test.describe("UserPlan EXPIRED en /panel/tienda", () => {
    test.describe.configure({ mode: "serial" });

    let runId: string;
    let planName: string;
    let seed: Awaited<ReturnType<typeof seedTier2ExpiredUserPlan>>;

    test.beforeAll(async () => {
      runId = Date.now().toString(36);
      planName = `E2E ExpiredPlan ${runId}`;
      seed = await seedTier2ExpiredUserPlan({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
        planName,
      });
    });

    test.afterAll(async () => {
      if (seed) {
        await cleanupTier2UserPlan(seed.userPlanId);
      }
      await cleanupPlans(planName);
    });

    test("admin ve el plan vencido en tab Históricos", async ({ page }) => {
      test.skip(!seed, "Sin DB en este worker");
      await page.goto("/panel/tienda");
      await expect(page.getByRole("heading", { name: /^Planes$/i })).toBeVisible({
        timeout: 15000,
      });

      // Tab "Históricos" debería mostrar al menos 1 plan vencido.
      const historyTab = page.getByRole("tab", { name: /históricos/i });
      await expect(historyTab).toBeVisible();
      await historyTab.click();

      // Aparece el item con el nombre del plan y el label "Vencido".
      const card = page
        .locator("li")
        .filter({ hasText: new RegExp(planName, "i") })
        .first();
      await expect(card).toBeVisible({ timeout: 10000 });
      await expect(card.getByText(/vencido/i)).toBeVisible();
    });
  });

  test.describe("Trial class limit", () => {
    test.describe.configure({ mode: "serial" });

    let runId: string;
    let title: string;
    let trialA: Awaited<ReturnType<typeof seedTier2TrialClass>>;
    let trialB: Awaited<ReturnType<typeof seedTier2TrialClass>>;

    test.beforeAll(async () => {
      runId = Date.now().toString(36);
      title = `E2E Trial ${runId}`;
      // Limpiamos reservas/planes previos del admin para empezar sin trial usado.
      await cleanupTier2UserReservations({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
      });
      await cleanupTier2UserPlansForUser({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
      });
      trialA = await seedTier2TrialClass({
        centerSlug: "e2e-test",
        title: `${title} A`,
        startsInHours: 48,
      });
      trialB = await seedTier2TrialClass({
        centerSlug: "e2e-test",
        title: `${title} B`,
        startsInHours: 72,
      });
    });

    test.afterAll(async () => {
      await cleanupTier2UserReservations({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
      });
      await cleanupLiveClasses(title);
    });

    test("primera reserva de trial OK; segunda bloqueada con TRIAL_ALREADY_USED", async ({
      request,
    }) => {
      test.skip(!trialA || !trialB, "Sin DB en este worker");

      // 1. Reserva exitosa de la primera clase trial.
      const r1 = await request.post("/api/reservations", {
        data: { liveClassId: trialA!.id },
      });
      expect(r1.status()).toBe(201);

      // 2. Intentar reservar la segunda clase trial → 400 con TRIAL_ALREADY_USED.
      const r2 = await request.post("/api/reservations", {
        data: { liveClassId: trialB!.id },
      });
      expect(r2.status()).toBe(400);
      const data = await r2.json();
      expect(data.code).toBe("TRIAL_ALREADY_USED");
    });
  });

  test.describe("Trial bloqueado para cliente migrado (isLegacyClient)", () => {
    test.describe.configure({ mode: "serial" });

    let runId: string;
    let title: string;
    let trial: Awaited<ReturnType<typeof seedTier2TrialClass>>;
    let prevLegacy: Awaited<ReturnType<typeof setTier2UserLegacyClient>>;

    test.beforeAll(async () => {
      runId = Date.now().toString(36);
      title = `E2E TrialLegacy ${runId}`;
      // Estado limpio: sin trial previo ni planes que abran otras rutas de elegibilidad.
      await cleanupTier2UserReservations({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
      });
      await cleanupTier2UserPlansForUser({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
      });
      trial = await seedTier2TrialClass({
        centerSlug: "e2e-test",
        title,
        startsInHours: 48,
      });
      prevLegacy = await setTier2UserLegacyClient({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
        isLegacyClient: true,
      });
    });

    test.afterAll(async () => {
      if (prevLegacy) {
        await setTier2UserLegacyClient({
          centerSlug: "e2e-test",
          userEmail: ADMIN_EMAIL,
          isLegacyClient: prevLegacy.previous,
        });
      }
      await cleanupTier2UserReservations({
        centerSlug: "e2e-test",
        userEmail: ADMIN_EMAIL,
      });
      await cleanupLiveClasses(title);
    });

    test("reservar clase de prueba retorna TRIAL_NOT_AVAILABLE", async ({
      request,
    }) => {
      test.skip(!trial || !prevLegacy, "Sin DB en este worker");

      const res = await request.post("/api/reservations", {
        data: { liveClassId: trial!.id },
      });
      expect(res.status()).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("TRIAL_NOT_AVAILABLE");
    });

    test("GET /api/reservations/can-show-trial-cta retorna showTrialCta=false", async ({
      request,
    }) => {
      test.skip(!trial || !prevLegacy, "Sin DB en este worker");

      const res = await request.get("/api/reservations/can-show-trial-cta");
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.showTrialCta).toBe(false);
    });
  });

  test.describe("Booking window (bookBeforeMinutes)", () => {
    test.describe.configure({ mode: "serial" });

    let runId: string;
    let title: string;
    let lc: Awaited<ReturnType<typeof seedTier2ClassWithinBookingWindow>>;

    test.beforeAll(async () => {
      runId = Date.now().toString(36);
      title = `E2E BookWindow ${runId}`;
      // No importa si tiene plan o trial: la ventana de reserva se chequea
      // antes de la elegibilidad de plan.
      lc = await seedTier2ClassWithinBookingWindow({
        centerSlug: "e2e-test",
        title,
        startsInHours: 12, // dentro de las 24h por default → bloqueado.
      });
    });

    test.afterAll(async () => {
      await cleanupLiveClasses(title);
    });

    test("reserva dentro de la ventana de bloqueo retorna BOOKING_WINDOW_CLOSED", async ({
      request,
    }) => {
      test.skip(!lc, "Sin DB en este worker");

      const res = await request.post("/api/reservations", {
        data: { liveClassId: lc!.id },
      });
      expect(res.status()).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("BOOKING_WINDOW_CLOSED");
      expect(data.message).toMatch(/anticipaci[oó]n/i);
    });
  });
});
