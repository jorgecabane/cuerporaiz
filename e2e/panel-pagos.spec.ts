import { test, expect } from "@playwright/test";

test.describe("Panel admin - Pagos", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("panel/pagos requiere login", async ({ page }) => {
      await page.goto("/panel/pagos");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin llega a pagos y ve heading", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: /^Pagos$/i })).toBeVisible();
    await page.getByRole("link", { name: /^Pagos$/i }).click();
    await expect(page).toHaveURL(/\/panel\/pagos/);
    await expect(
      page.getByRole("heading", { name: /Pagos y conciliación/i })
    ).toBeVisible();
  });
});
