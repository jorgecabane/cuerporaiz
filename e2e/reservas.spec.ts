import { test, expect } from "@playwright/test";

/**
 * Flujo: login → panel → reservas.
 * Usa credenciales de seed por defecto (admin@cuerporaiz.cl / admin123) o E2E_* si están definidas.
 */
test.describe("Reservas", () => {
  const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";
  const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

  test("panel reservas carga tras login y muestra secciones", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Entrar");

    await page.getByLabel(/centro/i).fill(centerSlug);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/);

    await page.goto("/panel/reservas");
    await expect(page).toHaveURL(/\/panel\/reservas/);
    await expect(page.getByRole("heading", { name: /clases en vivo y reservas/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /próximas clases/i })).toBeVisible();
  });
});
