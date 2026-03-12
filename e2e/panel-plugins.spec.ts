import { test, expect } from "@playwright/test";

/**
 * Panel Plugins: solo administrador puede acceder. Verifica enlace y página.
 */
test.describe("Panel admin - Plugins", () => {
  const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";
  const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

  test("plugins requiere login", async ({ page }) => {
    await page.goto("/panel/plugins");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("admin puede abrir plugins y ve MercadoPago", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/centro/i).fill(centerSlug);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("link", { name: /Plugins/i })).toBeVisible();
    await page.getByRole("link", { name: /Plugins/i }).click();

    await expect(page).toHaveURL(/\/panel\/plugins/);
    await expect(page.getByRole("heading", { name: /Plugins del centro/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /MercadoPago/i })).toBeVisible();
  });
});
