import { test, expect } from "@playwright/test";

test.describe("Panel admin - Plugins", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("plugins requiere login", async ({ page }) => {
      await page.goto("/panel/plugins");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin puede abrir plugins y ve marketplace", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("link", { name: /Plugins/i })).toBeVisible();
    await page.getByRole("link", { name: /Plugins/i }).click();

    await expect(page).toHaveURL(/\/panel\/plugins/);
    await expect(page.getByRole("heading", { name: /^Plugins$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /MercadoPago/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Transferencia bancaria/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Zoom/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Google Meet/i })).toBeVisible();
  });

  test("admin puede abrir página de Zoom", async ({ page }) => {
    await page.goto("/panel/plugins");
    await expect(page).toHaveURL(/\/panel\/plugins/);
    await page.getByRole("link", { name: /Zoom/i }).first().click();
    await expect(page).toHaveURL(/\/panel\/plugins\/zoom/);
    await expect(page.getByRole("heading", { name: /Zoom/i })).toBeVisible();
  });

  test("admin puede abrir página de Google Meet", async ({ page }) => {
    await page.goto("/panel/plugins");
    await expect(page).toHaveURL(/\/panel\/plugins/);
    await page.getByRole("link", { name: /Google Meet/i }).first().click();
    await expect(page).toHaveURL(/\/panel\/plugins\/meet/);
    await expect(page.getByRole("heading", { name: /Google Meet/i })).toBeVisible();
  });
});
