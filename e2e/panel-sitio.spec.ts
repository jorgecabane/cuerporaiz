import { test, expect } from "@playwright/test";

test.describe("Panel admin - Sitio", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("sitio requiere login", async ({ page }) => {
      await page.goto("/panel/sitio");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin ve la página de personalización con tabs", async ({ page }) => {
    await page.goto("/panel/sitio");
    await expect(page.getByRole("heading", { name: /sitio web/i })).toBeVisible({ timeout: 15000 });
    // Verify tabs exist (labels: Marca, Secciones, Contacto)
    await expect(page.getByRole("link", { name: /marca/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /secciones/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /contacto/i })).toBeVisible();
  });

  test("tab branding muestra color pickers", async ({ page }) => {
    await page.goto("/panel/sitio?tab=branding");
    await expect(page.getByRole("heading", { name: /sitio web/i })).toBeVisible({ timeout: 15000 });
    // Should have at least one color input
    await expect(page.locator('input[type="color"]').first()).toBeVisible();
  });

  test("tab secciones muestra lista con toggles", async ({ page }) => {
    await page.goto("/panel/sitio?tab=secciones");
    await expect(page.getByRole("heading", { name: /sitio web/i })).toBeVisible({ timeout: 15000 });
    // Should show toggle switches for sections
    await expect(page.getByRole("switch").first()).toBeVisible({ timeout: 5000 });
  });

  test("tab contacto muestra formulario", async ({ page }) => {
    await page.goto("/panel/sitio?tab=contacto");
    await expect(page.getByRole("heading", { name: /sitio web/i })).toBeVisible({ timeout: 15000 });
    // Should show email field
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });
});
