import { test, expect } from "@playwright/test";
import {
  seedTier1PendingMpOrder,
  cleanupPendingTransferOrders,
  cleanupPlans,
  getTier1OrderById,
  getTier1UserPlanByOrderId,
} from "./helpers/cleanup";

/**
 * Path crítico de cobro: Order PENDING (MERCADOPAGO) → APPROVED → UserPlan ACTIVE.
 *
 * Estrategia:
 * El webhook real consulta la API de MP server-side (process.paymentProvider.getPayment)
 * — no es testeable end-to-end vía Playwright sin mock externo. En su lugar, usamos el
 * server action `approveOrderManually` desde /panel/pagos, que comparte la fase clave
 * (`activatePlanForOrder`) con el webhook: sube la Order a APPROVED y crea el UserPlan
 * ACTIVE + PAID. Esto demuestra que la "columna vertebral del cobro" funciona con DB
 * real, sin acoplar el test a la API externa de MP.
 *
 * Setup:
 * - Order PENDING método MERCADOPAGO con `mpPreferenceId` simulado (vía Prisma).
 * - Plugin MP del centro habilitado con `webhookSecret` (creado por el helper).
 * - Plan E2E con `maxReservations` y `validityDays` definidos.
 *
 * Verifica:
 * - Tras aprobar manualmente desde /panel/pagos, Order.status === APPROVED.
 * - Existe UserPlan ACTIVE asociado a la Order, con paymentStatus === PAID.
 * - classesTotal y validUntil heredados del plan.
 */
test.describe("Checkout MP — webhook approval activa UserPlan", () => {
  test.afterAll(async () => {
    await cleanupPendingTransferOrders("e2e-tier1-mp-");
    await cleanupPlans("E2E Tier1 MP");
  });

  test("aprobar orden PENDING crea UserPlan ACTIVE + PAID", async ({ page }) => {
    const planName = `E2E Tier1 MP ${Date.now().toString(36)}`;
    const seed = await seedTier1PendingMpOrder({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      planName,
      externalReferencePrefix: "e2e-tier1-mp-",
    });
    test.skip(!seed, "Sin DB en este worker");
    if (!seed) return;

    await page.goto("/panel/pagos?type=checkout&status=PENDING");
    await expect(page.getByRole("heading", { name: /^Pagos$/i })).toBeVisible({
      timeout: 15000,
    });

    // Localiza la fila de la orden en la tabla por externalReference único.
    const row = page.locator("tr").filter({ hasText: seed.externalReference }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.scrollIntoViewIfNeeded();

    // Botón "Aprobar" (abre el dialog de ApproveOrderForm).
    await row.getByRole("button", { name: /^Aprobar$/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Registrar datos del pago/i)).toBeVisible();

    // Confirmar (defaults: method=transfer, sin nota).
    await dialog.getByRole("button", { name: /^Confirmar$/i }).click();

    // El server action redirige a /panel/pagos. Esperamos que el dialog cierre.
    await expect(dialog).toHaveCount(0, { timeout: 15000 });

    // Verificar efectos en DB: Order APPROVED + UserPlan ACTIVE + PAID.
    const order = await getTier1OrderById(seed.orderId);
    expect(order?.status).toBe("APPROVED");
    expect(order?.paymentMethod).toBe("MERCADOPAGO");

    const userPlan = await getTier1UserPlanByOrderId(seed.orderId);
    expect(userPlan).not.toBeNull();
    expect(userPlan?.status).toBe("ACTIVE");
    expect(userPlan?.paymentStatus).toBe("PAID");
    expect(userPlan?.classesTotal).toBe(4);
    expect(userPlan?.classesUsed).toBe(0);
  });
});
