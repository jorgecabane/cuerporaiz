import { test, expect } from "@playwright/test";

test.describe("Reservas (student) secciones", () => {
  test("puede ver Hoy, Próximas, Canceladas e Históricas en /panel/reservas", async ({ page }) => {
    // Mock de reservas: una futura (próximas) y una pasada (históricas).
    const now = Date.now();
    const futureStart = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    const pastStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    await page.route("**/api/reservations?page=1**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "res_future",
              userId: "me",
              liveClassId: "lc_future",
              userPlanId: "up",
              status: "CONFIRMED",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              liveClass: {
                id: "lc_future",
                centerId: "center",
                title: "Clase Futura",
                startsAt: futureStart,
                durationMinutes: 60,
                maxCapacity: 10,
                spotsLeft: 10,
                isOnline: true,
              },
            },
            {
              id: "res_past",
              userId: "me",
              liveClassId: "lc_past",
              userPlanId: "up",
              status: "ATTENDED",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              liveClass: {
                id: "lc_past",
                centerId: "center",
                title: "Clase Pasada",
                startsAt: pastStart,
                durationMinutes: 60,
                maxCapacity: 10,
                spotsLeft: 10,
                isOnline: true,
              },
            },
          ],
          total: 2,
          page: 1,
          pageSize: 50,
        }),
      });
    });

    await page.route("**/api/reservations/live-classes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });

    await page.route("**/api/reservations/can-show-trial-cta", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ showTrialCta: false }),
      });
    });

    await page.goto("/panel/reservas");
    await expect(page).toHaveURL(/\/panel\/reservas/);
    await expect(page.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible({ timeout: 15000 });

    // Tabs actuales: Hoy, Próximas, Canceladas, Históricas.
    await expect(page.getByRole("tab", { name: "Hoy", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Próximas", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Canceladas", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Históricas", exact: true })).toBeVisible();

    // Próximas: debe aparecer la clase futura.
    await page.getByRole("tab", { name: "Próximas", exact: true }).click();
    await expect(page.getByText("Clase Futura")).toBeVisible();

    // Históricas: debe aparecer la clase pasada.
    await page.getByRole("tab", { name: "Históricas", exact: true }).click();
    await expect(page.getByText("Clase Pasada")).toBeVisible();
  });
});
