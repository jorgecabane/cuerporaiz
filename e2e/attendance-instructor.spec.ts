import { test, expect } from "@playwright/test";
import {
  seedTier2PastReservation,
  cleanupLiveClasses,
  cleanupTier2UserReservationsOnClasses,
  ensureTier2DedicatedStudent,
  getTier2ReservationStatus,
} from "./helpers/cleanup";

/**
 * Cubre el rol INSTRUCTOR sobre `/api/admin/attendance` (el handler también
 * autoriza `isInstructorRole`, ver `app/api/admin/attendance/route.ts`).
 *
 * Este file matchea el proyecto `chromium-instructor` (storage state
 * `.auth/instructor.json`) por el sufijo `-instructor.spec.ts`.
 *
 * Usa un estudiante dedicado para no colisionar con otros specs en paralelo
 * (no-show-tracking.spec.ts y attendance.spec.ts comparten DB y centro).
 */

const CENTER_SLUG = "e2e-test";
const STUDENT_EMAIL = "attendance-instructor@e2e.test";
const STUDENT_PASSWORD = "AttendanceInstr123";

test.describe("Attendance (instructor) — marca ATTENDED y persiste en DB", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let seed: Awaited<ReturnType<typeof seedTier2PastReservation>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E Attendance Instructor ${runId}`;
    await ensureTier2DedicatedStudent({
      centerSlug: CENTER_SLUG,
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    });
    seed = await seedTier2PastReservation({
      centerSlug: CENTER_SLUG,
      userEmail: STUDENT_EMAIL,
      title,
      hoursAgo: 2,
    });
  });

  test.afterAll(async () => {
    if (seed) {
      await cleanupTier2UserReservationsOnClasses({
        userEmail: STUDENT_EMAIL,
        liveClassIds: [seed.liveClassId],
      });
    }
    await cleanupLiveClasses(title);
  });

  test("instructor marca reserva como ATTENDED → status persistido", async ({ request }) => {
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
});
