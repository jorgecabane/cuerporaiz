import { test, expect } from "@playwright/test";

test.describe("Checkout (student)", () => {
  test("inicia checkout, abre MercadoPago y vuelve (pending)", async ({ page }) => {
    // Mock del endpoint para evitar depender de credenciales MP reales.
    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orderId: "ord_e2e_student_1",
          checkoutUrl: "https://www.mercadopago.com/checkout/v1/redirect?pref_id=TEST_E2E_STUDENT",
        }),
      });
    });

    // Mock de la página de MP para no salir a internet.
    await page.route("**://www.mercadopago.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><head><title>MercadoPago</title></head><body>MP</body></html>",
      });
    });

    await page.goto("/planes");
    await expect(page.getByRole("heading", { name: "Planes", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Comprar", exact: true }).first().click();
    await expect(page).toHaveURL(/mercadopago\.com\/checkout\/v1\/redirect/, { timeout: 15000 });

    // Simula cerrar MP: volver a la app.
    await page.goto("/planes");
    await expect(page).toHaveURL(/\/planes/);
  });
});

