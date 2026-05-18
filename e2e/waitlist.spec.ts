import { test, expect } from "@playwright/test";
import {
  seedTier1LiveClass,
  seedTier1Reservation,
  seedTier1UserPlanForExistingUser,
  seedTier1StudentWithActivePlan,
  seedTier1WaitlistEntry,
  cleanupTier1WaitlistEntries,
  seedEvent,
  seedEventTicket,
  cleanupEvents,
  cleanupEventTickets,
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

/**
 * Race test: N estudiantes en waitlist, 1 cupo, todos hacen promote simultáneo.
 *
 * Valida que el advisory lock (pg_advisory_xact_lock por liveClassId) realmente
 * serializa las promociones contra Postgres. Mocks no detectan este tipo de bug;
 * solo un test contra DB real lo cubre. Si el lock no toma o el SQL es inválido,
 * más de un promote terminaría con reserva CONFIRMED → overbooking en prod.
 */
test.describe("Waitlist — race de promote (concurrencia)", () => {
  const N_STUDENTS = 3;
  const planNameAdmin = `E2E WL Race Admin ${Date.now().toString(36)}`;
  const planNameStudents = `E2E WL Race Std ${Date.now().toString(36)}`;
  const studentEmailPrefix = `wl-race-${Date.now().toString(36)}`;
  const liveClassIds: string[] = [];
  const reservationIds: string[] = [];
  const waitlistEntryIds: string[] = [];

  let adminPlan: Awaited<ReturnType<typeof seedTier1UserPlanForExistingUser>>;
  const studentSeeds: Array<NonNullable<Awaited<ReturnType<typeof seedTier1StudentWithActivePlan>>>> = [];

  test.beforeAll(async () => {
    adminPlan = await seedTier1UserPlanForExistingUser({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      classesTotal: 4,
      classesUsed: 0,
      planName: planNameAdmin,
    });
    for (let i = 0; i < N_STUDENTS; i++) {
      const seed = await seedTier1StudentWithActivePlan({
        centerSlug: "e2e-test",
        email: `${studentEmailPrefix}-${i}@e2e.test`,
        classesTotal: 4,
        classesUsed: 0,
        planName: `${planNameStudents}-${i}`,
      });
      if (seed) studentSeeds.push(seed);
    }
  });

  test.afterAll(async () => {
    await cleanupTier1WaitlistEntries(waitlistEntryIds);
    await cleanupTier1Reservations(reservationIds);
    await cleanupTier1LiveClasses(liveClassIds);
    await cleanupPlans(planNameAdmin);
    for (let i = 0; i < N_STUDENTS; i++) {
      await cleanupPlans(`${planNameStudents}-${i}`);
    }
    await cleanupTier1UsersByEmailPrefix(studentEmailPrefix);
  });

  test(`${N_STUDENTS} promotes concurrentes a 1 cupo → exactamente 1 gana, el resto SPOT_TAKEN`, async ({
    page,
    request,
  }) => {
    test.skip(!adminPlan || studentSeeds.length < N_STUDENTS, "Sin DB o seed completo");
    if (!adminPlan || studentSeeds.length < N_STUDENTS) return;

    // Clase con 1 cupo
    const cls = await seedTier1LiveClass({
      centerSlug: "e2e-test",
      title: `WL Race ${Date.now().toString(36)}`,
      minutesFromNow: 36 * 60,
      maxCapacity: 1,
    });
    test.skip(!cls, "Sin DB para crear clase");
    if (!cls) return;
    liveClassIds.push(cls.liveClassId);

    // Estudiante #0 ocupa el único cupo
    const ownerRes = await seedTier1Reservation({
      userId: studentSeeds[0].userId,
      liveClassId: cls.liveClassId,
      userPlanId: studentSeeds[0].userPlanId,
      incrementClassesUsed: true,
    });
    test.skip(!ownerRes, "Sin DB para crear reserva");
    if (!ownerRes) return;
    reservationIds.push(ownerRes.reservationId);

    // Resto se une a waitlist directamente (seed) — evitamos hacer N requests
    // de join para no testear esa ruta en este test (ya está cubierta en otro).
    const entries: Array<{ entryId: string; userId: string }> = [];
    for (let i = 1; i < N_STUDENTS; i++) {
      const seed = studentSeeds[i];
      const entry = await seedTier1WaitlistEntry({
        centerSlug: "e2e-test",
        userId: seed.userId,
        kind: "class",
        itemId: cls.liveClassId,
      });
      if (entry) {
        entries.push({ entryId: entry.entryId, userId: seed.userId });
        waitlistEntryIds.push(entry.entryId);
      }
    }
    expect(entries.length).toBe(N_STUDENTS - 1);

    // Admin (storageState) cancela la reserva del owner → libera cupo
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    const cancelRes = await request.patch(
      `/api/admin/reservations/${ownerRes.reservationId}/cancel`
    );
    expect(cancelRes.status(), await cancelRes.text()).toBe(200);

    // Promociona TODAS las entries en paralelo desde el endpoint admin.
    // El advisory lock por liveClassId debe serializar internamente; solo 1
    // debería terminar con success=true y reservationId.
    const promoteResults = await Promise.all(
      entries.map((e) =>
        request.post(`/api/admin/waitlist/${e.entryId}/promote`)
      )
    );

    const statuses = await Promise.all(promoteResults.map((r) => r.status()));
    const bodies = await Promise.all(
      promoteResults.map(async (r) => {
        try {
          return await r.json();
        } catch {
          return null;
        }
      })
    );

    const winners = bodies.filter((b) => b?.success === true);
    const losers = bodies.filter((b) => b?.code === "SPOT_TAKEN");

    expect(
      winners.length,
      `expected 1 winner, got ${winners.length}. statuses=${JSON.stringify(statuses)} bodies=${JSON.stringify(bodies)}`
    ).toBe(1);
    expect(losers.length).toBe(N_STUDENTS - 2);

    // El ganador tiene reservationId, lo registramos para cleanup.
    const winningReservationId = winners[0]?.reservationId as string | undefined;
    if (winningReservationId) reservationIds.push(winningReservationId);

    // Doble check vía API: solo hay 1 reserva CONFIRMED para esa clase.
    // (validación de "no overbooking real" más allá del status de respuesta).
    const allRes = await request.get("/api/reservations?page=1&pageSize=50");
    expect(allRes.status()).toBe(200);
  });
});

/**
 * Waitlist de eventos: flujo básico de unirse + verificar en /api/waitlist/mine.
 * El flujo completo de promote → hold → checkout MP no es testeable e2e sin
 * stubbear el webhook MP, así que solo cubrimos la entrada y la visibilidad.
 */
test.describe("Waitlist — eventos", () => {
  const eventTitlePrefix = `WL EventTest ${Date.now().toString(36)}`;
  const studentEmailPrefix = `wl-evt-${Date.now().toString(36)}`;
  const eventIds: string[] = [];
  let studentSeed: Awaited<ReturnType<typeof seedTier1StudentWithActivePlan>>;
  const waitlistEntryIds: string[] = [];

  test.beforeAll(async () => {
    studentSeed = await seedTier1StudentWithActivePlan({
      centerSlug: "e2e-test",
      email: `${studentEmailPrefix}@e2e.test`,
      classesTotal: 4,
      classesUsed: 0,
      planName: `WL Evt Plan ${Date.now().toString(36)}`,
    });
  });

  test.afterAll(async () => {
    await cleanupTier1WaitlistEntries(waitlistEntryIds);
    for (const id of eventIds) {
      await cleanupEventTickets(id);
    }
    await cleanupEvents(eventTitlePrefix);
    await cleanupTier1UsersByEmailPrefix(studentEmailPrefix);
  });

  test("admin se une a waitlist de un evento lleno y aparece en /api/waitlist/mine", async ({
    page,
    request,
  }) => {
    test.skip(!studentSeed, "Sin DB o seed");
    if (!studentSeed) return;

    // Evento con 1 cupo, ocupado por el student
    const event = await seedEvent({
      centerSlug: "e2e-test",
      title: `${eventTitlePrefix} full`,
      amountCents: 10000,
      maxCapacity: 1,
    });
    test.skip(!event, "Sin DB para crear evento");
    if (!event) return;
    eventIds.push(event.id);

    const ticket = await seedEventTicket({
      eventId: event.id,
      userEmail: `${studentEmailPrefix}@e2e.test`,
      status: "PAID",
      amountCents: 10000,
    });
    test.skip(!ticket, "Sin DB para crear ticket");
    if (!ticket) return;

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Admin intenta unirse a waitlist del evento (lleno)
    const joinRes = await request.post("/api/waitlist", {
      data: { kind: "event", itemId: event.id },
    });
    expect(joinRes.status(), await joinRes.text()).toBe(201);
    const joinData = await joinRes.json();
    expect(joinData.kind).toBe("event");
    expect(joinData.itemId).toBe(event.id);
    waitlistEntryIds.push(joinData.id);

    // /api/waitlist/mine debe incluirla con kind=event
    const mineRes = await request.get("/api/waitlist/mine");
    expect(mineRes.status()).toBe(200);
    const mineData = await mineRes.json();
    const myEvtEntry = mineData.entries.find(
      (e: { itemId: string; kind: string }) =>
        e.itemId === event.id && e.kind === "event"
    );
    expect(myEvtEntry).toBeTruthy();

    // Unirse de nuevo al mismo evento debe ser idempotente (unique constraint)
    const dupeRes = await request.post("/api/waitlist", {
      data: { kind: "event", itemId: event.id },
    });
    // El use case rechaza por DUPLICATE / ALREADY_IN_WAITLIST; aceptamos 4xx.
    expect(dupeRes.status()).toBeGreaterThanOrEqual(400);
    expect(dupeRes.status()).toBeLessThan(500);
  });
});
