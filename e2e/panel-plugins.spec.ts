import { test, expect } from "@playwright/test";

test.describe("Panel admin - Plugins", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("plugins requiere login", async ({ page }) => {
      await page.goto("/panel/plugins");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin puede abrir plugins y ve MercadoPago", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("link", { name: /Plugins/i })).toBeVisible();
    await page.getByRole("link", { name: /Plugins/i }).click();

    await expect(page).toHaveURL(/\/panel\/plugins/);
    await expect(page.getByRole("heading", { name: /Plugins del centro/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /MercadoPago/i })).toBeVisible();
  });
});
