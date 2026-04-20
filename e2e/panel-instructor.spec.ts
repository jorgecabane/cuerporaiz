import { test, expect } from "@playwright/test";

test.describe("Panel instructor flows", () => {
  test("instructor ve el panel home con greeting y 'Mis clases'", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Should see greeting
    const greeting = page.getByRole("heading", { level: 1 });
    await expect(greeting).toBeVisible();

    // Should see "Mis clases" in quick access (not "Mis reservas" which is student-only)
    const misClases = page.getByText(/Mis clases/i);
    await expect(misClases).toBeVisible({ timeout: 10000 });

    // Should NOT see admin quick access items
    await expect(page.getByText("Horarios")).not.toBeVisible();
    await expect(page.getByText("Clientes")).not.toBeVisible();
  });

  test("instructor ve sus clases en el calendario", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Calendar should load — either shows classes or empty state
    const calendarContent = page.locator("section").filter({
      has: page.getByText(/Calendario/i),
    });
    // Wait for calendar to render (loading skeleton disappears)
    await page.waitForTimeout(2000);

    // Should see class cards or "No hay clases" message
    const classCard = page.getByText(/Vinyasa|Yin|Clase E2E/i).first();
    const noClasses = page.getByText(/No hay clases/i);
    await expect(classCard.or(noClasses)).toBeVisible({ timeout: 10000 });
  });

  test("instructor no ve la sección Admin en el sidebar", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Should see standard nav items
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Reservas" })).toBeVisible();

    // Should NOT see Admin section or admin-only items
    await expect(page.getByRole("button", { name: "Admin" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Configuración" })).not.toBeVisible();
  });

  test("instructor puede acceder a la tienda", async ({ page }) => {
    await page.goto("/panel/tienda");
    await expect(page).toHaveURL(/\/panel\/tienda/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Planes", exact: true })).toBeVisible();
  });
});
