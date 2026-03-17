import { test, expect } from "@playwright/test";

test.describe("Panel reservas (admin) flujos críticos", () => {
  test("admin: reservar alumna, marcar asistencia y des-reservar", async ({ page }) => {
    const liveClassId = "lc_e2e_1";
    const reservationId = "res_e2e_1";
    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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

    await page.goto("/panel/reservas");
    await expect(page).toHaveURL(/\/panel\/reservas/);

    // Expand alumnos inscritos
    await page.getByRole("button", { name: /Alumnos inscritos/i }).click();
    await expect(page.getByText("Ana", { exact: true })).toBeVisible();

    // Reservar alumna dentro de la card
    await page.getByRole("button", { name: "Reservar alumno", exact: true }).click();
    await expect(page.getByText("Reservar alumna para esta clase")).toBeVisible();
    await page.getByRole("combobox").selectOption("stu_e2e_1");
    await page.getByRole("button", { name: "Reservar", exact: true }).click();
    await expect(page.getByText("Reserva confirmada para la alumna")).toBeVisible();

    // Marcar asistencia
    await page.getByRole("button", { name: "Presente", exact: true }).click();
    await expect(page.getByText("Marcada como presente")).toBeVisible();

    // Des-reservar
    await page.getByRole("button", { name: /Des-reservar/i }).click();
    await expect(page.getByText("Reserva cancelada")).toBeVisible();
  });
});

