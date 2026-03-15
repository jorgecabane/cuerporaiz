import { test, expect } from "@playwright/test";

test.describe("Planes y checkout", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("planes requiere login y redirige", async ({ page }) => {
      await page.goto("/planes");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("planes carga y muestra sección", async ({ page }) => {
    await page.goto("/planes");
    await expect(page).toHaveURL(/\/planes/);
    await expect(page.getByRole("heading", { name: /planes/i })).toBeVisible();
    await expect(page.getByText(/MercadoPago de forma segura/i)).toBeVisible();
  });

  test("panel tiene enlace a planes", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: /Planes y comprar/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /Planes y comprar/i }).first().click();
    await expect(page).toHaveURL(/\/planes/);
  });
});
