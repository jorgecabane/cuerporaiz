import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  seedTier2PastReservation,
  cleanupLiveClasses,
  cleanupTier2UserReservationsOnClasses,
  ensureTier2DedicatedStudent,
  getTier2ReservationStatus,
  seedForeignCenterFixtures,
  cleanupForeignCenterFixtures,
  seedForeignCenterPastReservation,
} from "./helpers/cleanup";

/**
 * E2E para el flujo de attendance (admin/instructor marca ATTENDED o NO_SHOW).
 *
 * Complementa `no-show-tracking.spec.ts` (que cubre NO_SHOW + counter) cubriendo
 * los gaps:
 *   1. Admin marca ATTENDED vía API real → reservation.status persiste en DB.
 *   2. Admin re-marca ATTENDED → NO_SHOW sobre la misma reserva.
 *   3. Student NO puede marcar asistencia → 403.
 *   4. Defense-in-depth multi-tenant: admin/instructor de centro A intenta
 *      marcar reserva cuya LiveClass es de centro B → 400 (use case bloquea).
 *
 * El caso "instructor (rol) marca ATTENDED vía API real" vive en
 * `attendance-instructor.spec.ts` porque corre en el proyecto
 * `chromium-instructor`.
 *
 * Cada describe usa un estudiante dedicado distinto para no colisionar con
 * `no-show-tracking.spec.ts` y `attendance-instructor.spec.ts`, que corren en
 * paralelo y comparten `student@e2e.test`.
 */

const CENTER_SLUG = "e2e-test";
const ADMIN_STUDENT_EMAIL = "attendance-admin@e2e.test";
const ADMIN_STUDENT_PASSWORD = "AttendanceAdmin123";
const AUTHZ_STUDENT_EMAIL = "attendance-authz@e2e.test";
const AUTHZ_STUDENT_PASSWORD = "AttendanceAuthz123";
const FOREIGN_STUDENT_EMAIL = "attendance-foreign@e2e.test";
const FOREIGN_STUDENT_PASSWORD = "AttendanceForeign123";

test.describe("Attendance — admin marca ATTENDED / re-marca y persiste en DB", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let seed: Awaited<ReturnType<typeof seedTier2PastReservation>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Attendance ${runId}`;
    await ensureTier2DedicatedStudent({
      centerSlug: CENTER_SLUG,
      email: ADMIN_STUDENT_EMAIL,
      password: ADMIN_STUDENT_PASSWORD,
    });
    seed = await seedTier2PastReservation({
      centerSlug: CENTER_SLUG,
      userEmail: ADMIN_STUDENT_EMAIL,
      title,
      hoursAgo: 2,
    });
  });

  test.afterAll(async () => {
    if (seed) {
      await cleanupTier2UserReservationsOnClasses({
        userEmail: ADMIN_STUDENT_EMAIL,
        liveClassIds: [seed.liveClassId],
      });
    }
    await cleanupLiveClasses(title);
  });

  test("admin marca reserva como ATTENDED y el status persiste en DB", async ({ request }) => {
    test.skip(!seed, "Sin DB en este worker");

    const res = await request.post("/api/admin/attendance", {
      data: { reservationId: seed!.reservationId, status: "ATTENDED" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);

    const status = await getTier2ReservationStatus(seed!.reservationId);
    expect(status).toBe("ATTENDED");
  });

  test("admin re-marca ATTENDED → NO_SHOW y el status se actualiza", async ({ request }) => {
    test.skip(!seed, "Sin DB en este worker");

    const res = await request.post("/api/admin/attendance", {
      data: { reservationId: seed!.reservationId, status: "NO_SHOW" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);

    const status = await getTier2ReservationStatus(seed!.reservationId);
    expect(status).toBe("NO_SHOW");
  });
});

test.describe("Attendance — autorización", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let seed: Awaited<ReturnType<typeof seedTier2PastReservation>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Attendance Auth ${runId}`;
    await ensureTier2DedicatedStudent({
      centerSlug: CENTER_SLUG,
      email: AUTHZ_STUDENT_EMAIL,
      password: AUTHZ_STUDENT_PASSWORD,
    });
    seed = await seedTier2PastReservation({
      centerSlug: CENTER_SLUG,
      userEmail: AUTHZ_STUDENT_EMAIL,
      title,
      hoursAgo: 2,
    });
  });

  test.afterAll(async () => {
    if (seed) {
      await cleanupTier2UserReservationsOnClasses({
        userEmail: AUTHZ_STUDENT_EMAIL,
        liveClassIds: [seed.liveClassId],
      });
    }
    await cleanupLiveClasses(title);
  });

  test("student NO puede marcar asistencia → 403", async ({ playwright, baseURL }) => {
    test.skip(!seed, "Sin DB en este worker");

    // Creamos un request context aparte y autenticamos como student vía
    // next-auth credentials (mismo patrón que plan-vs-trial-priority.spec.ts).
    const studentReq: APIRequestContext = await playwright.request.newContext({
      baseURL: baseURL ?? "http://localhost:3000",
    });
    try {
      const csrfRes = await studentReq.get("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const loginRes = await studentReq.post("/api/auth/callback/credentials", {
        form: {
          csrfToken,
          email: AUTHZ_STUDENT_EMAIL,
          password: AUTHZ_STUDENT_PASSWORD,
          centerId: CENTER_SLUG,
          json: "true",
          callbackUrl: `${baseURL ?? "http://localhost:3000"}/panel`,
        },
        maxRedirects: 0,
      });
      if (![200, 302].includes(loginRes.status())) {
        throw new Error(
          `Login student falló: ${loginRes.status()} ${await loginRes.text()}`,
        );
      }

      const res = await studentReq.post("/api/admin/attendance", {
        data: { reservationId: seed!.reservationId, status: "ATTENDED" },
      });
      expect(res.status()).toBe(403);

      // El status NO debe haber cambiado.
      const status = await getTier2ReservationStatus(seed!.reservationId);
      expect(status).toBe("CONFIRMED");
    } finally {
      await studentReq.dispose();
    }
  });
});

test.describe("Attendance — defense-in-depth multi-tenant", () => {
  test.describe.configure({ mode: "serial" });

  let foreignFixtures: Awaited<ReturnType<typeof seedForeignCenterFixtures>> = null;
  let foreignSeed: Awaited<ReturnType<typeof seedForeignCenterPastReservation>> = null;
  let runId: string;
  let title: string;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Attendance Foreign ${runId}`;
    await ensureTier2DedicatedStudent({
      centerSlug: CENTER_SLUG,
      email: FOREIGN_STUDENT_EMAIL,
      password: FOREIGN_STUDENT_PASSWORD,
    });
    foreignFixtures = await seedForeignCenterFixtures();
    if (foreignFixtures) {
      foreignSeed = await seedForeignCenterPastReservation({
        userEmail: FOREIGN_STUDENT_EMAIL,
        title,
        hoursAgo: 2,
      });
    }
  });

  test.afterAll(async () => {
    // Borrar el centro extranjero cascadea LiveClass + Reservation creadas acá.
    await cleanupForeignCenterFixtures();
    await cleanupLiveClasses(title);
  });

  test("admin de e2e-test intenta marcar reserva del centro extranjero → 400 y no muta", async ({
    request,
  }) => {
    test.skip(!foreignFixtures || !foreignSeed, "Sin DB en este worker");
    if (!foreignSeed) return;

    const res = await request.post("/api/admin/attendance", {
      data: { reservationId: foreignSeed.reservationId, status: "ATTENDED" },
    });
    // El use case detecta `liveClass.centerId !== session.centerId` y devuelve
    // `success: false`, que el handler mapea a 400.
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no pertenece a este centro/i);

    const status = await getTier2ReservationStatus(foreignSeed.reservationId);
    expect(status).toBe("CONFIRMED");
  });
});
