import { test, expect } from "@playwright/test";
import {
  seedTier1LiveClass,
  seedTier1Reservation,
  seedTier1UserPlanForExistingUser,
  seedTier1StudentWithActivePlan,
  cleanupPlans,
  cleanupTier1LiveClasses,
  cleanupTier1Reservations,
  cleanupTier1UsersByEmailPrefix,
} from "./helpers/cleanup";

/**
 * E2E waitlist — flujo completo:
 * 1. Setup: clase con capacity=1, otro estudiante con plan + reserva CONFIRMED.
 * 2. Admin (autenticado vía storageState) intenta unirse → entra a waitlist.
 * 3. Admin verifica /api/waitlist/mine → tiene la entry.
 * 4. Cancela la reserva del otro estudiante (vía Prisma, simula cancelación).
 *    El trigger de notify es fire-and-forget; el correo no se valida en E2E.
 *    Lo importante: el admin sigue en waitlist hasta promote.
 * 5. Admin hace promote → 200 + reservation creada.
 * 6. Verifica que /api/reservations contiene la nueva reserva.
 *
 * El correo (broadcast) se valida en unit tests (notify-waitlist-on-spot-freed.test.ts).
 */
test.describe("Waitlist — flujo completo", () => {
  const planNameAdmin = `E2E WL Admin ${Date.now().toString(36)}`;
  const planNameStudent = `E2E WL Student ${Date.now().toString(36)}`;
  const studentEmailPrefix = `wl-student-${Date.now().toString(36)}`;
  const studentEmail = `${studentEmailPrefix}@e2e.test`;
  const liveClassIds: string[] = [];
  const reservationIds: string[] = [];

  let adminPlan: Awaited<ReturnType<typeof seedTier1UserPlanForExistingUser>>;
  let studentSeed: Awaited<ReturnType<typeof seedTier1StudentWithActivePlan>>;

  test.beforeAll(async () => {
    adminPlan = await seedTier1UserPlanForExistingUser({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      classesTotal: 4,
      classesUsed: 0,
      planName: planNameAdmin,
    });
    studentSeed = await seedTier1StudentWithActivePlan({
      centerSlug: "e2e-test",
      email: studentEmail,
      classesTotal: 4,
      classesUsed: 0,
      planName: planNameStudent,
    });
  });

  test.afterAll(async () => {
    await cleanupTier1Reservations(reservationIds);
    await cleanupTier1LiveClasses(liveClassIds);
    await cleanupPlans(planNameAdmin);
    await cleanupPlans(planNameStudent);
    await cleanupTier1UsersByEmailPrefix(studentEmailPrefix);
  });

  test("admin se une a waitlist, otro cancela y admin se promueve", async ({
    page,
    request,
  }) => {
    test.skip(!adminPlan || !studentSeed, "Sin DB o seed");
    if (!adminPlan || !studentSeed) return;

    // Clase con 1 cupo, mañana (>24h para evitar bookBeforeMinutes)
    const cls = await seedTier1LiveClass({
      centerSlug: "e2e-test",
      title: `WL Class ${Date.now().toString(36)}`,
      minutesFromNow: 36 * 60, // 36 horas
      maxCapacity: 1,
    });
    test.skip(!cls, "Sin DB para crear clase");
    if (!cls) return;
    liveClassIds.push(cls.liveClassId);

    // El otro estudiante reserva el único cupo (vía seed para evitar bookBeforeMinutes en API)
    const otherReservation = await seedTier1Reservation({
      userId: studentSeed.userId,
      liveClassId: cls.liveClassId,
      userPlanId: studentSeed.userPlanId,
      incrementClassesUsed: true,
    });
    test.skip(!otherReservation, "Sin DB para crear reserva ajena");
    if (!otherReservation) return;
    reservationIds.push(otherReservation.reservationId);

    // Sesión admin (storageState default)
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Admin intenta unirse a la waitlist (clase llena)
    const joinRes = await request.post("/api/waitlist", {
      data: { kind: "class", itemId: cls.liveClassId },
    });
    expect(joinRes.status(), await joinRes.text()).toBe(201);
    const joinData = await joinRes.json();
    expect(joinData.kind).toBe("class");
    expect(joinData.position).toBe(1);

    // Admin verifica /api/waitlist/mine
    const mineRes = await request.get("/api/waitlist/mine");
    expect(mineRes.status()).toBe(200);
    const mineData = await mineRes.json();
    expect(Array.isArray(mineData.entries)).toBe(true);
    const myEntry = mineData.entries.find(
      (e: { itemId: string }) => e.itemId === cls.liveClassId
    );
    expect(myEntry).toBeTruthy();
    expect(myEntry.kind).toBe("class");
    const entryId = myEntry.id as string;

    // Admin (staff) cancela la reserva del otro estudiante via endpoint admin.
    // Esto dispara notifyWaitlistOnSpotFreed (fire-and-forget) — los emails se
    // validan en unit tests; aquí verificamos que la entry quede promovible.
    const cancelOther = await request.patch(
      `/api/admin/reservations/${otherReservation.reservationId}/cancel`
    );
    expect(cancelOther.status(), await cancelOther.text()).toBe(200);

    // Admin se promueve manualmente (esto valida el flujo end-to-end del promote endpoint
    // con la transacción atómica)
    const promoteRes = await request.post(`/api/waitlist/${entryId}/promote`);
    expect(promoteRes.status(), await promoteRes.text()).toBe(200);
    const promoteData = await promoteRes.json();
    expect(promoteData.success).toBe(true);
    expect(promoteData.kind).toBe("class");
    expect(promoteData.reservationId).toBeTruthy();
    reservationIds.push(promoteData.reservationId);

    // Verifica que tiene una reserva confirmada en esa clase
    const myResRes = await request.get("/api/reservations?page=1&pageSize=50");
    expect(myResRes.status()).toBe(200);
    const myResData = await myResRes.json();
    const found = myResData.items.find(
      (r: { liveClassId: string; status: string }) =>
        r.liveClassId === cls.liveClassId && r.status === "CONFIRMED"
    );
    expect(found).toBeTruthy();

    // Verifica que la entry ya no aparece en /api/waitlist/mine (PROMOTED, no activa)
    const mineAfterRes = await request.get("/api/waitlist/mine");
    const mineAfterData = await mineAfterRes.json();
    const stillThere = mineAfterData.entries.find(
      (e: { itemId: string }) => e.itemId === cls.liveClassId
    );
    expect(stillThere).toBeUndefined();
  });

  test("unirse a waitlist falla con HAS_SPOTS si la clase tiene cupos", async ({
    page,
    request,
  }) => {
    test.skip(!adminPlan, "Sin DB o seed");
    if (!adminPlan) return;

    const cls = await seedTier1LiveClass({
      centerSlug: "e2e-test",
      title: `WL HasSpots ${Date.now().toString(36)}`,
      minutesFromNow: 36 * 60,
      maxCapacity: 10, // sobrado de cupo
    });
    test.skip(!cls, "Sin DB para crear clase");
    if (!cls) return;
    liveClassIds.push(cls.liveClassId);

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    const joinRes = await request.post("/api/waitlist", {
      data: { kind: "class", itemId: cls.liveClassId },
    });
    expect(joinRes.status()).toBe(409);
    const data = await joinRes.json();
    expect(data.code).toBe("HAS_SPOTS");
  });
});
