import { test, expect } from "@playwright/test";

/**
 * Panel admin - Clientes (listado/detalle). Solo rol ADMINISTRADORA.
 */
test.describe("Panel admin - Clientes", () => {
  const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";
  const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

  test("panel/clientes requiere login", async ({ page }) => {
    await page.goto("/panel/clientes");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("admin llega a clientes y ve heading", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/centro/i).fill(centerSlug);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("link", { name: /Clientes \(admin\)/i })).toBeVisible();
    await page.getByRole("link", { name: /Clientes \(admin\)/i }).click();
    await expect(page).toHaveURL(/\/panel\/clientes/);
    await expect(page.getByRole("heading", { name: /Clientes \(admin\)/i })).toBeVisible();
  });
});
