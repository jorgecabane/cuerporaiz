import { test, expect } from "@playwright/test";
import {
  seedTier1LiveClass,
  seedTier1Reservation,
  seedTier1UserPlanForExistingUser,
  setTier1CenterPolicies,
  cleanupPlans,
  cleanupTier1LiveClasses,
  cleanupTier1Reservations,
  getTier1ReservationById,
  getTier1UserPlanClassesUsed,
} from "./helpers/cleanup";

/**
 * Cobertura del modelo de cancelación (`cancelBeforeMinutes`).
 *
 * Default del centro: 720 min (12 h). Si la cancelación llega antes del
 * umbral, la clase se libera y `classesUsed` se decrementa. Si llega
 * después, queda como `LATE_CANCELLED` y la clase queda consumida.
 *
 * Setup:
 * - Asegura `cancelBeforeMinutes=720` (default; lo seteamos explícito por
 *   seguridad) para que 1 h dispare LATE_CANCELLED y mañana (>12 h)
 *   dispare CANCELLED.
 * - La reserva la insertamos vía Prisma (no POST), evitando el filtro
 *   `bookBeforeMinutes` del use case de reserva.
 *
 * Storage state: admin (default project). El use case
 * `cancelReservationUseCase` no checkea role; el admin puede cancelar su
 * propia reserva (mismo userId que la reserva).
 */
test.describe("Reservas — cancelación con/sin penalización", () => {
  const planName = `E2E Tier1 Cancel ${Date.now().toString(36)}`;
  const liveClassIds: string[] = [];
  const reservationIds: string[] = [];
  let seededPlan: Awaited<ReturnType<typeof seedTier1UserPlanForExistingUser>>;
  let originalPolicies: Awaited<ReturnType<typeof setTier1CenterPolicies>>;

  test.beforeAll(async () => {
    originalPolicies = await setTier1CenterPolicies("e2e-test", {
      cancelBeforeMinutes: 720,
    });

    // Plan con 2 clases ya consumidas para que decrementar deje 1.
    seededPlan = await seedTier1UserPlanForExistingUser({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      classesTotal: 4,
      classesUsed: 2,
      planName,
    });
  });

  test.afterAll(async () => {
    await cleanupTier1Reservations(reservationIds);
    await cleanupTier1LiveClasses(liveClassIds);
    await cleanupPlans(planName);
    if (originalPolicies) {
      await setTier1CenterPolicies("e2e-test", originalPolicies);
    }
  });

  test("cancelar reserva > 12 h antes deja CANCELLED y devuelve la clase", async ({
    page,
    request,
  }) => {
    test.skip(!seededPlan, "Sin DB o seed en este worker");
    if (!seededPlan) return;

    // Clase mañana a la misma hora (~24 h en el futuro → > 12 h).
    const cls = await seedTier1LiveClass({
      centerSlug: "e2e-test",
      title: `Tier1 Cancel A ${Date.now().toString(36)}`,
      minutesFromNow: 24 * 60,
    });
    test.skip(!cls, "Sin DB para crear clase");
    if (!cls) return;
    liveClassIds.push(cls.liveClassId);

    const res = await seedTier1Reservation({
      userId: seededPlan.userId,
      liveClassId: cls.liveClassId,
      userPlanId: seededPlan.userPlanId,
      incrementClassesUsed: true,
    });
    test.skip(!res, "Sin DB para crear reserva");
    if (!res) return;
    reservationIds.push(res.reservationId);

    // Antes: classesUsed debería haber subido a 3 (2 inicial + 1 incremento).
    const before = await getTier1UserPlanClassesUsed(seededPlan.userPlanId);
    expect(before).toBe(3);

    // Sesión admin para que la cookie acompañe la request autenticada.
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    const cancel = await request.patch(
      `/api/reservations/${res.reservationId}/cancel`,
    );
    expect(cancel.status(), await cancel.text()).toBe(200);

    const reservation = await getTier1ReservationById(res.reservationId);
    expect(reservation?.status).toBe("CANCELLED");

    // classesUsed devuelve la clase: 3 → 2.
    const after = await getTier1UserPlanClassesUsed(seededPlan.userPlanId);
    expect(after).toBe(2);
  });

  test("cancelar reserva < 12 h antes deja LATE_CANCELLED y consume la clase", async ({
    page,
    request,
  }) => {
    test.skip(!seededPlan, "Sin DB o seed en este worker");
    if (!seededPlan) return;

    // Clase en 1 hora (< 12 h del cancelBeforeMinutes default).
    const cls = await seedTier1LiveClass({
      centerSlug: "e2e-test",
      title: `Tier1 Cancel B ${Date.now().toString(36)}`,
      minutesFromNow: 60,
    });
    test.skip(!cls, "Sin DB para crear clase");
    if (!cls) return;
    liveClassIds.push(cls.liveClassId);

    const res = await seedTier1Reservation({
      userId: seededPlan.userId,
      liveClassId: cls.liveClassId,
      userPlanId: seededPlan.userPlanId,
      incrementClassesUsed: true,
    });
    test.skip(!res, "Sin DB para crear reserva");
    if (!res) return;
    reservationIds.push(res.reservationId);

    const before = await getTier1UserPlanClassesUsed(seededPlan.userPlanId);
    expect(before).not.toBeNull();
    const beforeNum = before as number;

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    const cancel = await request.patch(
      `/api/reservations/${res.reservationId}/cancel`,
    );
    expect(cancel.status(), await cancel.text()).toBe(200);

    const reservation = await getTier1ReservationById(res.reservationId);
    expect(reservation?.status).toBe("LATE_CANCELLED");

    // classesUsed NO se decrementa: la clase queda consumida.
    const after = await getTier1UserPlanClassesUsed(seededPlan.userPlanId);
    expect(after).toBe(beforeNum);
  });
});
