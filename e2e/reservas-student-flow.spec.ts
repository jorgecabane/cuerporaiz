import { test, expect } from "@playwright/test";

test.describe("Reservas (student)", () => {
  test("reservar clase y luego cancelar desde Mis reservas", async ({ page }) => {
    // Mockeamos API para que el flow sea estable en pre-commit/CI (sin depender de estado DB).
    const liveClassId = "lc_e2e_student_1";
    const reservationId = "res_e2e_student_1";
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let reserved = false;

    await page.route("**/api/reservations/live-classes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: liveClassId,
              centerId: "center",
              title: "Clase Student E2E",
              startsAt,
              durationMinutes: 60,
              maxCapacity: 10,
              spotsLeft: 10,
              isOnline: true,
              instructorName: "Profe",
              instructorImageUrl: null,
            },
          ],
        }),
      });
    });

    await page.route("**/api/reservations?page=1**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: reserved
            ? [
                {
                  id: reservationId,
                  userId: "me",
                  liveClassId,
                  userPlanId: "up",
                  status: "CONFIRMED",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  liveClass: {
                    id: liveClassId,
                    centerId: "center",
                    title: "Clase Student E2E",
                    startsAt,
                    durationMinutes: 60,
                    maxCapacity: 10,
                    spotsLeft: 10,
                    isOnline: true,
                    instructorName: "Profe",
                    instructorImageUrl: null,
                  },
                },
              ]
            : [],
          total: reserved ? 1 : 0,
          page: 1,
          pageSize: 50,
        }),
      });
    });

    await page.route("**/api/reservations", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      reserved = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: reservationId,
          userId: "me",
          liveClassId,
          userPlanId: "up",
          status: "CONFIRMED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route(`**/api/reservations/${reservationId}/cancel`, async (route) => {
      reserved = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/panel/reservas");
    await expect(page).toHaveURL(/\/panel\/reservas/);
    await expect(page.getByRole("heading", { name: /clases en vivo y reservas/i })).toBeVisible({ timeout: 15000 });

    // En Mis reservas debe aparecer opción de cancelar.
    await page.getByRole("tab", { name: "Mis reservas", exact: true }).click();
    // Forzamos re-carga para que consuma el mock ya "reserved".
    await page.reload();
    const cancelarBtn = page.getByRole("button", { name: "Cancelar reserva", exact: true }).first();
    await expect(cancelarBtn).toBeVisible({ timeout: 15000 });
    await cancelarBtn.click();
    await expect(page.getByText("Reserva cancelada")).toBeVisible({ timeout: 15000 });
  });
});

