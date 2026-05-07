import { test, expect } from "@playwright/test";
import { seedEvent, cleanupEvents } from "./helpers/cleanup";

/**
 * Compra de tickets de eventos. Cubre:
 * - Evento gratis: click en "Reservar (gratis)" → ticket PAID instantáneo
 *   (no hay redirect a MP).
 * - Evento de pago: click en "Comprar — $X" → mock de /api/events/[id]/checkout
 *   devuelve checkoutUrl → redirige a MP (también mockeado para no salir
 *   a internet).
 *
 * Usa el centro "e2e-test" con bankTransferAcceptEvents=false (default) para
 * que el flujo siga el camino MP, no el selector de transferencia.
 */
test.describe("Eventos — compra de tickets", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let freeEvent: { id: string; title: string } | null = null;
  let paidEvent: { id: string; title: string } | null = null;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    freeEvent = await seedEvent({
      centerSlug: "e2e-test",
      title: `E2E Evento Gratis ${runId}`,
      amountCents: 0,
    });
    paidEvent = await seedEvent({
      centerSlug: "e2e-test",
      title: `E2E Evento Pago ${runId}`,
      amountCents: 25000,
    });
  });

  test.afterAll(async () => {
    await cleanupEvents(`E2E Evento Gratis ${runId}`);
    await cleanupEvents(`E2E Evento Pago ${runId}`);
  });

  test("evento gratis: reservar crea ticket inmediatamente", async ({ page }) => {
    test.skip(!freeEvent, "Seed del evento gratis no disponible (sin DB en este worker)");
    if (!freeEvent) return;

    // Mock para no depender del estado real del backend en MP-related calls.
    await page.route(`**/api/events/${freeEvent.id}/checkout`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ticket: {
            id: "e2e-ticket-free",
            eventId: freeEvent!.id,
            status: "PAID",
          },
        }),
      });
    });

    await page.goto(`/panel/eventos/${freeEvent.id}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(freeEvent.title, "i") })
    ).toBeVisible({ timeout: 15000 });

    const reservar = page.getByRole("button", { name: /Reservar \(gratis\)/i });
    await expect(reservar).toBeVisible();
    await reservar.click();

    // Toast de confirmación (texto puede variar — usamos regex laxa).
    await expect(
      page.getByText(/inscripción confirmada|reserva|confirmad/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("evento pago: comprar redirige a MP (mockeado)", async ({ page }) => {
    test.skip(!paidEvent, "Seed del evento pago no disponible (sin DB en este worker)");
    if (!paidEvent) return;

    // Mock del endpoint para no depender de credenciales MP.
    await page.route(`**/api/events/${paidEvent.id}/checkout`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutUrl: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=E2E_TEST",
        }),
      });
    });

    // Mock de la página de MP para no salir a internet.
    await page.route("**://www.mercadopago.cl/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><head><title>MercadoPago</title></head><body>MP</body></html>",
      });
    });

    await page.goto(`/panel/eventos/${paidEvent.id}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(paidEvent.title, "i") })
    ).toBeVisible({ timeout: 15000 });

    const comprar = page.getByRole("button", { name: /Comprar/i });
    await expect(comprar).toBeVisible();
    await comprar.click();

    // Espera la redirección al dominio mockeado de MP.
    await page.waitForURL(/mercadopago\.cl/, { timeout: 15000 });
    expect(page.url()).toContain("mercadopago.cl");
  });

  test("evento pago: backend reportó EVENT_FULL → toast de error", async ({ page }) => {
    test.skip(!paidEvent, "Seed del evento pago no disponible (sin DB en este worker)");
    if (!paidEvent) return;

    await page.route(`**/api/events/${paidEvent.id}/checkout`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "EVENT_FULL", message: "El evento está lleno" }),
      });
    });

    await page.goto(`/panel/eventos/${paidEvent.id}`);
    await page.getByRole("button", { name: /Comprar/i }).click();
    await expect(page.getByText(/agotado|lleno/i).first()).toBeVisible({ timeout: 10000 });
  });
});
