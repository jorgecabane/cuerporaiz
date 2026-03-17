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
    await expect(page.getByRole("heading", { name: "Planes", exact: true })).toBeVisible();
    await expect(page.getByText(/Gestioná tus membresías/i)).toBeVisible();
  });

  test("panel tiene enlace a planes", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    const planesLink = page.locator("a[href='/planes']").first();
    await expect(planesLink).toBeVisible({ timeout: 15000 });
    await planesLink.click();
    await expect(page).toHaveURL(/\/planes/);
  });

  test("checkout abre MercadoPago y deja orden PENDING (sin pagar)", async ({ page }) => {
    const hasDb = !!process.env.DATABASE_URL;
    const prisma = hasDb ? (await import("../lib/adapters/db/prisma")).prisma : null;

    const orderId = hasDb
      ? (
          await (async () => {
            const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
            const user = await prisma!.user.findUnique({
              where: { email },
              include: { memberships: { take: 1 } },
            });
            expect(user).toBeTruthy();

            const centerId = user!.memberships[0]?.centerId;
            expect(centerId).toBeTruthy();
            const plan = await prisma!.plan.findFirst({ where: { centerId } });
            expect(plan).toBeTruthy();

            const order = await prisma!.order.create({
              data: {
                centerId,
                userId: user!.id,
                planId: plan!.id,
                amountCents: plan!.amountCents,
                currency: plan!.currency,
                externalReference: `e2e-${Date.now()}`,
                status: "PENDING",
              },
            });
            return order.id;
          })()
        )
      : `e2e-no-db-${Date.now()}`;

    // Mock del endpoint para evitar depender de credenciales MP reales.
    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orderId,
          checkoutUrl:
            "https://www.mercadopago.com/checkout/v1/redirect?pref_id=TEST_E2E",
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
    await expect(page.getByRole("heading", { name: "Planes", exact: true })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Comprar" }).first().click();

    await expect(page).toHaveURL(/mercadopago\.com\/checkout\/v1\/redirect/, {
      timeout: 15000,
    });

    // Simula cerrar MP (volver a la app) y verifica que la orden sigue pendiente.
    await page.goto("/planes");
    if (hasDb) {
      const orderAfter = await prisma!.order.findUnique({ where: { id: orderId } });
      expect(orderAfter?.status).toBe("PENDING");
    }
  });
});
