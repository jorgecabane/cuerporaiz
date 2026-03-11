import { test, expect } from "@playwright/test";

/**
 * Flujo: login → panel → planes. Verifica que la página de planes cargue
 * y muestre contenido (lista de planes o mensaje de sin planes).
 * No sigue el redirect a MercadoPago para no depender de credenciales externas.
 */
test.describe("Planes y checkout", () => {
  const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";
  const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

  test("planes requiere login y redirige", async ({ page }) => {
    await page.goto("/planes");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("planes carga tras login y muestra sección", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/centro/i).fill(centerSlug);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/);

    await page.goto("/planes");
    await expect(page).toHaveURL(/\/planes/);
    await expect(page.getByRole("heading", { name: /planes/i })).toBeVisible();
    await expect(page.getByText(/MercadoPago de forma segura/i)).toBeVisible();
  });

  test("panel tiene enlace a planes", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/centro/i).fill(centerSlug);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("link", { name: /Planes y comprar/i })).toBeVisible();
    await page.getByRole("link", { name: /Planes y comprar/i }).click();
    await expect(page).toHaveURL(/\/planes/);
  });
});
