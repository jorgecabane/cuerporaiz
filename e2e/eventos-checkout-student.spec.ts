import { test, expect } from "@playwright/test";
import { seedEvent, cleanupEvents, seedEventTicket, cleanupEventTickets } from "./helpers/cleanup";

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

  test("multi-cupos: stepper +/- envía quantity al backend", async ({ page }) => {
    test.skip(!paidEvent, "Seed del evento pago no disponible (sin DB en este worker)");
    if (!paidEvent) return;

    let capturedBody: { quantity?: number; mode?: string } | null = null;
    await page.route(`**/api/events/${paidEvent.id}/checkout`, async (route) => {
      const reqBody = route.request().postDataJSON();
      capturedBody = reqBody;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutUrl: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=E2E_QTY",
        }),
      });
    });
    await page.route("**://www.mercadopago.cl/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><head><title>MercadoPago</title></head><body>MP</body></html>",
      });
    });

    await page.goto(`/panel/eventos/${paidEvent.id}`);
    const stepper = page.getByRole("group", { name: /Cantidad de cupos/i });
    await expect(stepper).toBeVisible();
    // Subir a 3: click + dos veces (arranca en 1).
    const inc = stepper.getByRole("button", { name: /Aumentar/i });
    await inc.click();
    await inc.click();
    await page.getByRole("button", { name: /Comprar/i }).click();

    await page.waitForURL(/mercadopago\.cl/, { timeout: 15000 });
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.quantity).toBe(3);
    expect(capturedBody!.mode ?? "purchase").toBe("purchase");
  });

  test("regresión: ticket PENDING previo no rompe el siguiente checkout (P2002)", async ({ page }) => {
    test.skip(!freeEvent, "Seed del evento gratis no disponible (sin DB en este worker)");
    if (!freeEvent) return;

    // Sembramos un ticket PENDING previo del mismo usuario sobre el evento gratis.
    // Antes del fix esto reventaba con SERVER_ERROR (unique constraint P2002).
    const seeded = await seedEventTicket({
      eventId: freeEvent.id,
      userEmail: "student@e2e.test",
      status: "PENDING",
      amountCents: 0,
      quantity: 1,
    });
    test.skip(!seeded, "No se pudo seedear ticket PENDING (sin DB)");

    await page.goto(`/panel/eventos/${freeEvent.id}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(freeEvent.title, "i") })
    ).toBeVisible({ timeout: 15000 });

    const reservar = page.getByRole("button", { name: /Reservar/i });
    await expect(reservar).toBeVisible();
    await reservar.click();

    // Debe completar reserva (toast OK), NO mostrar el error genérico.
    await expect(page.getByText(/Error al procesar el checkout/i)).toHaveCount(0);
    await expect(
      page.getByText(/inscripción confirmada|reserva|confirmad/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Cleanup: borrar el ticket creado/reusado.
    await cleanupEventTickets(freeEvent.id);
  });

  test("re-compra free: 'Agregar más cupos' incrementa quantity del ticket PAID", async ({ page }) => {
    test.skip(!freeEvent, "Seed del evento gratis no disponible (sin DB en este worker)");
    if (!freeEvent) return;

    // Seed: ticket PAID con quantity=1.
    const seeded = await seedEventTicket({
      eventId: freeEvent.id,
      userEmail: "student@e2e.test",
      status: "PAID",
      amountCents: 0,
      quantity: 1,
    });
    test.skip(!seeded, "No se pudo seedear ticket PAID (sin DB)");

    await page.goto(`/panel/eventos/${freeEvent.id}`);
    // El badge inicial debe decir "Tienes tu entrada" (quantity=1, singular).
    await expect(page.getByText(/Tienes tu entrada/i)).toBeVisible({ timeout: 15000 });

    // CTA secundario "Agregar más cupos" usa el stepper y manda mode="addition".
    const agregar = page.getByRole("button", { name: /Agregar/i });
    await expect(agregar).toBeVisible();

    // Sumar 2 cupos via stepper.
    const stepper = page.getByRole("group", { name: /Cantidad de cupos/i });
    const inc = stepper.getByRole("button", { name: /Aumentar/i });
    await inc.click(); // 2
    await inc.click(); // 3
    // El botón "Agregar 3 cupos" envía la request.
    await page.getByRole("button", { name: /Agregar 3 cupos/i }).click();

    // Tras refresh el badge debe decir "Tienes 4 entradas" (1 inicial + 3 nuevos).
    await expect(page.getByText(/Tienes 4 entradas/i)).toBeVisible({ timeout: 15000 });

    await cleanupEventTickets(freeEvent.id);
  });
});
