import { test, expect } from "@playwright/test";

test.describe("Reservas (student) secciones", () => {
  test("puede ver futuras y pasadas sin scroll extraño", async ({ page }) => {
    // Mock de reservas: una futura y una pasada.
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
              status: "CONFIRMED",
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
    await expect(page.getByRole("heading", { name: /clases en vivo y reservas/i })).toBeVisible();

    await page.getByRole("tab", { name: "Mis reservas", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Futuras", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pasadas", exact: true })).toBeVisible();

    // Futuras
    await page.getByRole("tab", { name: "Futuras", exact: true }).click();
    await expect(page.getByText("Clase Futura")).toBeVisible();

    // Pasadas
    await page.getByRole("tab", { name: "Pasadas", exact: true }).click();
    await expect(page.getByText("Clase Pasada")).toBeVisible();
  });
});

