import { test, expect } from "@playwright/test";
import {
  seedTier1LiveClass,
  seedTier1UserPlanForExistingUser,
  cleanupPlans,
  cleanupTier1LiveClasses,
  cleanupTier1Reservations,
  getTier1UserPlanClassesUsed,
  getTier1ReservationById,
} from "./helpers/cleanup";

/**
 * Test de reserva contra DB real (sin mocks de API). Verifica:
 *  - POST /api/reservations crea una Reservation CONFIRMED.
 *  - UserPlan.classesUsed se incrementa en 1.
 *
 * Storage state: admin (default chromium project) — no usa "student" en el
 * nombre del archivo para correr en el project default. El use case
 * `reserveClassUseCase` no gating por role, así que admin con UserPlan ACTIVE
 * puede reservar a nivel modelo (esto ya se hace en otros tests; ej.
 * `checkout-transferencia-flow.spec.ts`).
 */
test.describe("Reservas reales (DB) — flujo de reserva", () => {
  const planName = `E2E Tier1 Reserva ${Date.now().toString(36)}`;
  const liveClassIds: string[] = [];
  const reservationIds: string[] = [];
  let seededUserPlan: Awaited<ReturnType<typeof seedTier1UserPlanForExistingUser>>;
  let seededClass: Awaited<ReturnType<typeof seedTier1LiveClass>>;

  test.beforeAll(async () => {
    seededUserPlan = await seedTier1UserPlanForExistingUser({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      classesTotal: 4,
      classesUsed: 0,
      planName,
    });

    // Clase suficientemente futura para pasar `bookBeforeMinutes` (default 24 h).
    seededClass = await seedTier1LiveClass({
      centerSlug: "e2e-test",
      title: `Tier1 Reserva ${Date.now().toString(36)}`,
      daysFromNow: 3,
      hour: 10,
      maxCapacity: 10,
    });
    if (seededClass) liveClassIds.push(seededClass.liveClassId);
  });

  test.afterAll(async () => {
    await cleanupTier1Reservations(reservationIds);
    await cleanupTier1LiveClasses(liveClassIds);
    await cleanupPlans(planName);
  });

  test("POST /api/reservations crea Reservation CONFIRMED y descuenta clase", async ({
    page,
    request,
  }) => {
    test.skip(
      !seededUserPlan || !seededClass,
      "Sin DB o seed incompleto en este worker",
    );
    if (!seededUserPlan || !seededClass) return;

    // Asegurar sesión activa (el storageState ya trae cookies admin).
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    const before = await getTier1UserPlanClassesUsed(seededUserPlan.userPlanId);
    expect(before).toBe(0);

    // Llamada autenticada al endpoint real (Playwright reutiliza cookies del context).
    const res = await request.post("/api/reservations", {
      data: {
        liveClassId: seededClass.liveClassId,
        userPlanId: seededUserPlan.userPlanId,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("CONFIRMED");
    reservationIds.push(body.id);

    // Verificar efectos en DB.
    const reservation = await getTier1ReservationById(body.id);
    expect(reservation?.status).toBe("CONFIRMED");
    expect(reservation?.userPlanId).toBe(seededUserPlan.userPlanId);

    const after = await getTier1UserPlanClassesUsed(seededUserPlan.userPlanId);
    expect(after).toBe(1);
  });

  test("POST /api/reservations duplicado responde 409 ALREADY_RESERVED", async ({
    request,
  }) => {
    test.skip(
      !seededUserPlan || !seededClass,
      "Sin DB o seed incompleto en este worker",
    );
    if (!seededUserPlan || !seededClass) return;

    // Aseguramos que existe la reserva del primer test (mismo describe, secuencial).
    const dup = await request.post("/api/reservations", {
      data: {
        liveClassId: seededClass.liveClassId,
        userPlanId: seededUserPlan.userPlanId,
      },
    });
    expect(dup.status()).toBe(409);
    const body = (await dup.json()) as { code?: string };
    expect(body.code).toBe("ALREADY_RESERVED");
  });
});
