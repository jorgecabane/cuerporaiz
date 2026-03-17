import { test, expect } from "@playwright/test";

test.describe("Panel admin - Clientes", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("panel/clientes requiere login", async ({ page }) => {
      await page.goto("/panel/clientes");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin llega a clientes y ve heading", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: /^Clientes$/i })).toBeVisible();
    await page.getByRole("link", { name: /^Clientes$/i }).click();
    await expect(page).toHaveURL(/\/panel\/clientes/);
    await expect(page.getByRole("heading", { name: /^Alumnas$/i })).toBeVisible();
  });
});
