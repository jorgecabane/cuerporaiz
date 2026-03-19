import { test, expect } from "@playwright/test";

test.describe("Reservas (student)", () => {
  test("reservar clase y luego cancelar desde Mis reservas", async ({ page }) => {
    // Mockeamos API para que el flow sea estable en pre-commit/CI (sin depender de estado DB).
    const liveClassId = "lc_e2e_student_1";
    const reservationId = "res_e2e_student_1";
    // Clase dentro de la semana visible del calendario (hoy + 1h).
    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    let reserved = false;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    await page.route("**/api/reservations/live-classes**", async (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to) return route.fulfill({ status: 400 });
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

    // Flujo en /panel: calendario + sheet "Mis reservas" (botón en accesos rápidos).
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole("heading", { name: /Hola|Home/i })).toBeVisible({ timeout: 15000 });

    // Reservar desde el calendario (ClassCard con botón "Reservar").
    await expect(page.getByRole("button", { name: "Reservar", exact: true }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Reservar", exact: true }).first().click();

    // Abrir el sheet "Mis reservas" desde el botón de la barra inferior (accesos rápidos).
    await page.getByRole("button", { name: "Reservas", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Mis reservas" })).toBeVisible({ timeout: 5000 });

    // En el sheet debe aparecer la reserva; cancelar (botón "Cancelar" en la lista).
    const cancelarBtn = page.getByRole("dialog", { name: "Mis reservas" }).getByRole("button", { name: "Cancelar", exact: true }).first();
    await expect(cancelarBtn).toBeVisible({ timeout: 10000 });
    await cancelarBtn.click();

    // Confirmar en el modal (a tiempo o tardía).
    await expect(page.getByRole("button", { name: /Sí, cancelar|Cancelar igual/ })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Sí, cancelar|Cancelar igual/ }).click();
    await expect(page.getByText(/Reserva cancelada|Se descontó 1 clase/)).toBeVisible({ timeout: 15000 });
  });

  test("abre sheet Mis reservas desde /panel y ve tab Canceladas", async ({ page }) => {
    await page.route("**/api/reservations?page=1**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 50 }),
      });
    });
    await page.route("**/api/reservations/live-classes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole("button", { name: "Reservas", exact: true }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Reservas", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Mis reservas" })).toBeVisible({ timeout: 5000 });

    await page.getByRole("tab", { name: "Canceladas", exact: true }).click();
    await expect(page.getByText("No tienes reservas canceladas.")).toBeVisible();
  });
});
