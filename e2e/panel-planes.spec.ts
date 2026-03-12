import { test, expect } from "@playwright/test";

/**
 * Panel admin - Planes (CRUD). Solo rol ADMINISTRATOR (admin).
 * Verifica: redirect si no admin, admin llega a /panel/planes y ve el listado o vacío.
 */
test.describe("Panel admin - Planes", () => {
  const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";
  const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

  test("panel/planes requiere login", async ({ page }) => {
    await page.goto("/panel/planes");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("admin llega a planes y ve heading", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/centro/i).fill(centerSlug);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("link", { name: /Planes \(admin\)/i })).toBeVisible();
    await page.getByRole("link", { name: /Planes \(admin\)/i }).click();
    await expect(page).toHaveURL(/\/panel\/planes/);
    await expect(page.getByRole("heading", { name: /Planes \(admin\)/i })).toBeVisible();
  });
});
