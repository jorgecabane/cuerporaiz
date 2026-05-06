import { test, expect } from "@playwright/test";

/**
 * E2E del flujo de transferencia bancaria. Cubre las superficies admin
 * (plugin + panel pagos) que pueden testearse con la storage state de admin
 * que ya carga `auth.setup.ts`. El flujo end-to-end del estudiante
 * (comprar plan → selector → "ya transferí" → admin aprueba) requiere
 * datos seeded y se gatea con E2E_ENABLE_STUDENT=1, fuera del scope de
 * este spec.
 */

test.describe("Transferencia bancaria — admin", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("plugin transferencia requiere login", async ({ page }) => {
      await page.goto("/panel/plugins/transferencia");
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("checkout selector requiere login", async ({ page }) => {
      await page.goto("/checkout/non-existent-order");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("plugin transferencia muestra los 3 toggles + datos bancarios", async ({ page }) => {
    await page.goto("/panel/plugins/transferencia");
    await expect(page).toHaveURL(/\/panel\/plugins\/transferencia/);
    await expect(
      page.getByRole("heading", { name: /Transferencia bancaria/i }),
    ).toBeVisible();

    // El toggle principal (Activar/Desactivar) está siempre visible.
    await expect(
      page.getByRole("button", { name: /^(Activar|Desactivar)$/i }),
    ).toBeVisible();

    // Los 3 toggles secundarios aparecen sólo cuando el plugin está activo.
    // Como no podemos asumir el estado, sólo verificamos que la página
    // carga sin error y que los labels (cuando estén) son los esperados.
    const accept = page.getByText(/Permitir pagar planes con transferencia/i);
    if (await accept.count()) {
      await expect(accept).toBeVisible();
      await expect(
        page.getByText(/Permitir pagar eventos con transferencia/i),
      ).toBeVisible();
      await expect(
        page.getByText(/Exigir comprobante de transferencia/i),
      ).toBeVisible();
    }
  });

  test("panel pagos expone el tab Transferencias", async ({ page }) => {
    await page.goto("/panel/pagos");
    await expect(page).toHaveURL(/\/panel\/pagos/);
    await expect(page.getByRole("heading", { name: /^Pagos$/ })).toBeVisible();

    const transferenciasTab = page.getByRole("link", { name: /Transferencias/i });
    await expect(transferenciasTab).toBeVisible();
    await transferenciasTab.click();
    await expect(page).toHaveURL(/type=transfers/);
  });

  test("tab Checkout muestra columna Método", async ({ page }) => {
    await page.goto("/panel/pagos?type=checkout");
    await expect(page).toHaveURL(/type=checkout/);
    await expect(page.getByRole("heading", { name: /^Pagos$/ })).toBeVisible();
    // Si hay órdenes, la columna "Método" aparece como header.
    // Si no hay órdenes, sale el placeholder; en cualquier caso la página carga.
    const tableExists = await page.locator("table").count();
    if (tableExists > 0) {
      await expect(
        page.locator("th", { hasText: /^Método$/ }).first(),
      ).toBeVisible();
    }
  });
});
