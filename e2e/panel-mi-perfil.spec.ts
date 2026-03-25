import { test, expect } from "@playwright/test";

test.describe("Panel Mi perfil", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("mi-perfil requiere login", async ({ page }) => {
      await page.goto("/panel/mi-perfil");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("carga la página y muestra tab Mis datos por defecto", async ({ page }) => {
    await page.goto("/panel/mi-perfil");
    await expect(page.getByRole("heading", { name: /mi perfil/i })).toBeVisible({ timeout: 15000 });
    // Default tab: Mis datos
    await expect(page.getByLabel(/nombre/i).first()).toBeVisible();
  });

  test("tabs navegan entre secciones", async ({ page }) => {
    await page.goto("/panel/mi-perfil");
    await expect(page.getByRole("heading", { name: /mi perfil/i })).toBeVisible({ timeout: 15000 });

    // Tab navigation links
    const tabPlan = page.getByRole("link", { name: /mi plan/i });
    const tabCorreos = page.getByRole("link", { name: /correos/i });
    const tabDatos = page.getByRole("link", { name: /mis datos/i });

    await expect(tabPlan).toBeVisible();
    await expect(tabCorreos).toBeVisible();
    await expect(tabDatos).toBeVisible();

    // Switch to Mi plan tab
    await tabPlan.click();
    await expect(page).toHaveURL(/tab=plan/);

    // Switch to Correos tab
    await tabCorreos.click();
    await expect(page).toHaveURL(/tab=correos/);

    // Switch back to Mis datos
    await tabDatos.click();
    await expect(page).toHaveURL(/tab=perfil/);
    await expect(page.getByLabel(/nombre/i).first()).toBeVisible();
  });

  test("tab Correos muestra toggle switches", async ({ page }) => {
    await page.goto("/panel/mi-perfil?tab=correos");
    await expect(page.getByRole("heading", { name: /mi perfil/i })).toBeVisible({ timeout: 15000 });
    // Should show at least one email preference toggle
    await expect(page.getByRole("switch").first()).toBeVisible({ timeout: 5000 });
  });

  test("tab Mi plan muestra contenido", async ({ page }) => {
    await page.goto("/panel/mi-perfil?tab=plan");
    await expect(page.getByRole("heading", { name: /mi perfil/i })).toBeVisible({ timeout: 15000 });
    // Should show either a plan card or "No tienes un plan activo"
    const planContent = page.locator("text=/plan|tienda/i").first();
    await expect(planContent).toBeVisible({ timeout: 5000 });
  });

  test("tab Mis datos tiene formulario de cambio de contraseña", async ({ page }) => {
    await page.goto("/panel/mi-perfil?tab=perfil");
    await expect(page.getByRole("heading", { name: /mi perfil/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: /cambiar contraseña/i })).toBeVisible();
    await expect(page.getByLabel(/contraseña actual/i)).toBeVisible();
  });
});
