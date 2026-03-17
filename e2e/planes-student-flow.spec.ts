import { test, expect } from "@playwright/test";

test.describe("Planes (student)", () => {
  test("ve Mis planes (activos) y Planes disponibles", async ({ page }) => {
    await page.goto("/planes");
    await expect(page).toHaveURL(/\/planes/);

    await expect(page.getByRole("heading", { name: "Planes", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mis planes", exact: true })).toBeVisible();

    // Tab Activos
    await page.getByRole("tab", { name: /Activos/i }).click();
    // Seed crea un plan LIVE activo para student; verificamos que al menos muestre el card.
    await expect(page.getByText(/Quedan/i)).toBeVisible();

    // Sección Planes disponibles
    await expect(page.getByRole("heading", { name: "Planes disponibles", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Comprar", exact: true }).first()).toBeVisible();
  });
});

