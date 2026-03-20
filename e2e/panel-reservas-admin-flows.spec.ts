import { test, expect, type Page } from "@playwright/test";

/** Pocos minutos en el futuro (puede caer en otro día local cerca de medianoche). */
function mockClassStartsAtIso(): string {
  return new Date(Date.now() + 12 * 60 * 1000).toISOString();
}

async function selectWeekTabShowingClass(page: Page, title: string) {
  await page.getByRole("tablist", { name: /Días de la semana/i }).waitFor({ timeout: 15_000 });
  if (await page.getByText(title).isVisible().catch(() => false)) return;
  const tabs = page.getByRole("tab");
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    if (await page.getByText(title).isVisible().catch(() => false)) return;
  }
  throw new Error(`No se encontró "${title}" en ningún día de la semana mostrada`);
}

test.describe("Panel reservas (admin) flujos críticos", () => {
  test("admin: reservar estudiante, marcar asistencia y des-reservar", async ({ page }) => {
    const liveClassId = "lc_e2e_1";
    const reservationId = "res_e2e_1";
    const startsAt = mockClassStartsAtIso();

    await page.route("**/api/panel/staff/calendar-classes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: liveClassId,
              centerId: "center",
              title: "Clase E2E",
              startsAt,
              durationMinutes: 60,
              maxCapacity: 10,
              spotsLeft: 9,
              isOnline: true,
              instructorName: "Profe E2E",
              instructorImageUrl: null,
            },
          ],
        }),
      });
    });

    await page.route(`**/api/admin/attendance?liveClassId=${liveClassId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            reservationId,
            userId: "user_e2e_1",
            userName: "Ana",
            userEmail: "ana@e2e.cl",
            status: "CONFIRMED",
          },
        ]),
      });
    });

    await page.route("**/api/panel/staff/students", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "stu_e2e_1", name: "Berta", email: "berta@e2e.cl" },
        ]),
      });
    });

    await page.route("**/api/admin/reserve-for-student", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route("**/api/admin/attendance", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route(`**/api/admin/reservations/${reservationId}/cancel`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/);

    await selectWeekTabShowingClass(page, "Clase E2E");
    await expect(page.getByText("Clase E2E")).toBeVisible();

    // Expand estudiantes inscritos
    await page.getByRole("button", { name: /Estudiantes inscritos/i }).click();
    await expect(page.getByText("Ana", { exact: true })).toBeVisible();

    // Reservar estudiante dentro de la card
    await page.getByRole("button", { name: "Reservar estudiante", exact: true }).click();
    await expect(page.getByText("Reservar estudiante para esta clase")).toBeVisible();
    await page.getByRole("combobox").selectOption("stu_e2e_1");
    const reserveReq = page.waitForRequest((req) => {
      return (
        req.method() === "POST" &&
        new URL(req.url()).pathname.endsWith("/api/admin/reserve-for-student")
      );
    });
    await page.getByRole("button", { name: "Reservar", exact: true }).click();
    await reserveReq;
    await expect(page.getByText("Reservar estudiante para esta clase")).not.toBeVisible();

    // Marcar asistencia
    const attendanceReq = page.waitForRequest((req) => {
      return (
        req.method() === "POST" &&
        new URL(req.url()).pathname.endsWith("/api/admin/attendance")
      );
    });
    await page.getByRole("button", { name: "Presente", exact: true }).click();
    await attendanceReq;

    // Des-reservar
    const cancelReq = page.waitForRequest((req) => {
      return (
        req.method() === "PATCH" &&
        new URL(req.url()).pathname.endsWith(`/api/admin/reservations/${reservationId}/cancel`)
      );
    });
    await page.getByRole("button", { name: /Des-reservar/i }).click();
    await cancelReq;
  });
});

