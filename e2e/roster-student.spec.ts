import { test, expect } from "@playwright/test";
import {
  seedTier1LiveClass,
  seedTier1StudentWithActivePlan,
  seedTier1Reservation,
  seedForeignCenterFixtures,
  cleanupForeignCenterFixtures,
  cleanupLiveClasses,
  cleanupTier1Reservations,
  setTier2CenterShowRoster,
} from "./helpers/cleanup";

/**
 * E2E — roster de compañeros registrados (vista alumno).
 * Corre en el proyecto `chromium-student` (storageState .auth/student.json,
 * usuario student@e2e.test), solo con E2E_ENABLE_STUDENT=1.
 */

const CENTER_SLUG = "e2e-test";

test.describe("Roster de compañeros — policy activada", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let toggle: Awaited<ReturnType<typeof setTier2CenterShowRoster>>;
  let liveClass: Awaited<ReturnType<typeof seedTier1LiveClass>>;
  let companion: Awaited<ReturnType<typeof seedTier1StudentWithActivePlan>>;
  let companionReservation: Awaited<ReturnType<typeof seedTier1Reservation>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Roster ${runId}`;
    toggle = await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: true });
    liveClass = await seedTier1LiveClass({ centerSlug: CENTER_SLUG, title, daysFromNow: 2 });
    companion = await seedTier1StudentWithActivePlan({
      centerSlug: CENTER_SLUG,
      email: `roster-companion-${runId}@e2e.test`,
    });
    if (liveClass && companion) {
      companionReservation = await seedTier1Reservation({
        userId: companion.userId,
        liveClassId: liveClass.liveClassId,
        userPlanId: companion.userPlanId,
      });
    }
  });

  test.afterAll(async () => {
    if (companionReservation) {
      await cleanupTier1Reservations([companionReservation.reservationId]);
    }
    await cleanupLiveClasses(title);
    if (toggle) {
      await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: toggle.previous });
    }
  });

  test("alumno ve al compañero registrado (nombre+avatar) sin email en la respuesta", async ({ request }) => {
    test.skip(!liveClass || !companionReservation, "Sin DB en este worker");

    const res = await request.get(`/api/reservations/roster?liveClassId=${liveClass!.liveClassId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ userId: companion!.userId, name: "Student Tier1" });
    expect(body[0]).not.toHaveProperty("email");
  });
});

test.describe("Roster de compañeros — policy desactivada", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let toggle: Awaited<ReturnType<typeof setTier2CenterShowRoster>>;
  let liveClass: Awaited<ReturnType<typeof seedTier1LiveClass>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Roster Disabled ${runId}`;
    toggle = await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: false });
    liveClass = await seedTier1LiveClass({ centerSlug: CENTER_SLUG, title, daysFromNow: 2 });
  });

  test.afterAll(async () => {
    await cleanupLiveClasses(title);
    if (toggle) {
      await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: toggle.previous });
    }
  });

  test("endpoint devuelve 403 ROSTER_DISABLED", async ({ request }) => {
    test.skip(!liveClass, "Sin DB en este worker");

    const res = await request.get(`/api/reservations/roster?liveClassId=${liveClass!.liveClassId}`);
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("ROSTER_DISABLED");
  });
});

test.describe("Roster de compañeros — aislamiento multi-tenant", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let toggle: Awaited<ReturnType<typeof setTier2CenterShowRoster>>;
  let foreignFixtures: Awaited<ReturnType<typeof seedForeignCenterFixtures>> = null;
  let foreignLiveClass: Awaited<ReturnType<typeof seedTier1LiveClass>> = null;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Roster Foreign ${runId}`;
    toggle = await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: true });
    foreignFixtures = await seedForeignCenterFixtures();
    if (foreignFixtures) {
      foreignLiveClass = await seedTier1LiveClass({ centerSlug: "e2e-foreign", title, daysFromNow: 2 });
    }
  });

  test.afterAll(async () => {
    await cleanupForeignCenterFixtures();
    await cleanupLiveClasses(title);
    if (toggle) {
      await setTier2CenterShowRoster({ centerSlug: CENTER_SLUG, show: toggle.previous });
    }
  });

  test("alumno de e2e-test no puede leer el roster de una clase de otro centro → 404", async ({ request }) => {
    test.skip(!foreignFixtures || !foreignLiveClass, "Sin DB en este worker");

    const res = await request.get(
      `/api/reservations/roster?liveClassId=${foreignLiveClass!.liveClassId}`
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
  });
});
