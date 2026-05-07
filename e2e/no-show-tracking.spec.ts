import { test, expect } from "@playwright/test";
import {
  seedTier2PastReservation,
  cleanupLiveClasses,
  countTier2NoShowsThisMonth,
  cleanupTier2UserReservations,
} from "./helpers/cleanup";

/**
 * E2E para el tracking de no-shows.
 *
 * La política `maxNoShowsPerMonth` (default 2) bloquea reservas futuras
 * cuando un usuario acumula N no-shows en el mes corriente. La marca de
 * NO_SHOW se hace manualmente vía `/api/admin/attendance` (admin/instructor).
 *
 * Este spec cubre:
 *  1. Marcar una reserva pasada como NO_SHOW vía la API admin → status en DB.
 *  2. Verificar que el counter incrementa.
 *
 * No simulamos llegar al límite (2) y bloquear porque el seedeado del student
 * puede compartirse con otros tests; verificar la lógica del bloqueo está
 * cubierto por unit tests en `lib/application/reserve-class.test.ts`.
 */

const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? "student@e2e.test";

test.describe("No-show tracking — admin marca NO_SHOW", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let title: string;
  let seed: Awaited<ReturnType<typeof seedTier2PastReservation>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    title = `E2E NoShow ${runId}`;
    // Limpiamos reservas previas del student para no contaminar el counter.
    await cleanupTier2UserReservations({
      centerSlug: "e2e-test",
      userEmail: STUDENT_EMAIL,
    });
    seed = await seedTier2PastReservation({
      centerSlug: "e2e-test",
      userEmail: STUDENT_EMAIL,
      title,
      hoursAgo: 2,
    });
  });

  test.afterAll(async () => {
    await cleanupTier2UserReservations({
      centerSlug: "e2e-test",
      userEmail: STUDENT_EMAIL,
    });
    await cleanupLiveClasses(title);
  });

  test("admin marca reserva como NO_SHOW y el counter incrementa", async ({ request }) => {
    test.skip(!seed, "Sin DB en este worker");

    const beforeCount = (await countTier2NoShowsThisMonth({
      centerSlug: "e2e-test",
      userEmail: STUDENT_EMAIL,
    })) ?? 0;

    // POST a la API admin de attendance.
    const res = await request.post("/api/admin/attendance", {
      data: { reservationId: seed!.reservationId, status: "NO_SHOW" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);

    const afterCount = (await countTier2NoShowsThisMonth({
      centerSlug: "e2e-test",
      userEmail: STUDENT_EMAIL,
    })) ?? 0;
    expect(afterCount).toBe(beforeCount + 1);
  });
});
