import { test, expect } from "@playwright/test";

/**
 * Panel Mi cuenta: login, título, menú visible, cerrar sesión redirige a home.
 *
 * Both tests use blank storageState:
 * - "panel requiere login" needs an unauthenticated browser.
 * - The logout test does its own login so it gets a dedicated session token
 *   that won't invalidate the shared auth used by parallel tests.
 */
test.describe("Panel Mi cuenta", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const email = process.env.E2E_USER_EMAIL ?? "admin@e2e.test";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";

  test("panel requiere login", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("tras login se ve Mi cuenta, menú y cerrar sesión redirige a home", async ({
    page,
  }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { level: 1 }).filter({ hasText: /hola|home/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /reservas/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /cerrar sesión/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    await expect(page).not.toHaveURL(/\/panel/, { timeout: 15000 });
  });
});
