import { test, expect } from "@playwright/test";
import {
  seedPendingTransferOrder,
  cleanupPendingTransferOrders,
  cleanupPlans,
} from "./helpers/cleanup";

/**
 * Acciones del admin sobre transferencias pendientes:
 * - Aprobar: abre modal, confirma, la fila debe desaparecer del tab Transferencias.
 * - Rechazar: modal con motivo (mín 10 chars), confirmar y la fila desaparece.
 *
 * Cada test crea su propia Order pendiente vía Prisma (helper) y limpia
 * después. Usa nombres de plan únicos para que las locators sean robustas.
 */
test.describe("Checkout transferencia — admin aprueba/rechaza", () => {
  test.afterAll(async () => {
    await cleanupPendingTransferOrders("e2e-tx-admin-");
    await cleanupPlans("E2E TX Admin");
  });

  test("admin aprueba una transferencia pendiente", async ({ page }) => {
    const planName = `E2E TX Admin Aprobar ${Date.now().toString(36)}`;
    const seed = await seedPendingTransferOrder({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      planName,
      externalReferencePrefix: "e2e-tx-admin-",
    });
    test.skip(!seed, "Sin DB en este worker");
    if (!seed) return;

    await page.goto("/panel/pagos?type=transfers");
    await expect(page.getByRole("heading", { name: /^Pagos$/i })).toBeVisible({
      timeout: 15000,
    });

    // Localiza la fila por la clase única del card de transferencia
    // (bg-[#FFFBEB]) y filtra por el plan name único.
    const card = page
      .locator("[class*='FFFBEB']")
      .filter({ hasText: new RegExp(planName, "i") })
      .first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.scrollIntoViewIfNeeded();

    await card.getByRole("button", { name: /^Aprobar$/i }).click();

    // Modal de confirmación.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Aprobar transferencia/i)).toBeVisible();

    await dialog.getByRole("button", { name: /Confirmar aprobaci[oó]n/i }).click();

    // Esperamos que el modal cierre (señal de que el server action completó
    // — `redirect()` re-renderiza la página y desmonta el dialog).
    // waitForURL no sirve acá porque la URL ya matcheaba /panel/pagos antes
    // del action.
    await expect(dialog).toHaveCount(0, { timeout: 15000 });

    // Volvemos al tab transferencias y verificamos que la fila desapareció
    // (status pasa a APPROVED y deja de matchear PENDING+TRANSFER).
    await page.goto("/panel/pagos?type=transfers");
    await expect(
      page.getByText(new RegExp(planName, "i"))
    ).toHaveCount(0, { timeout: 10000 });
  });

  test("admin rechaza con motivo válido", async ({ page }) => {
    const planName = `E2E TX Admin Rechazar ${Date.now().toString(36)}`;
    const seed = await seedPendingTransferOrder({
      centerSlug: "e2e-test",
      userEmail: process.env.E2E_USER_EMAIL ?? "admin@e2e.test",
      planName,
      externalReferencePrefix: "e2e-tx-admin-",
    });
    test.skip(!seed, "Sin DB en este worker");
    if (!seed) return;

    await page.goto("/panel/pagos?type=transfers");

    const card = page
      .locator("[class*='FFFBEB']")
      .filter({ hasText: new RegExp(planName, "i") })
      .first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.scrollIntoViewIfNeeded();

    await card.getByRole("button", { name: /^Rechazar$/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Rechazar transferencia/i)).toBeVisible();

    // Rellenar motivo con texto > 10 chars.
    await dialog
      .getByLabel(/Motivo del rechazo/i)
      .fill("El monto recibido fue $19.900 en lugar de $29.900");

    await dialog.getByRole("button", { name: /Confirmar rechazo/i }).click();

    // Esperamos que el modal cierre (señal de que el server action completó).
    await expect(dialog).toHaveCount(0, { timeout: 15000 });

    // Volvemos al tab transferencias y verificamos que la fila desapareció
    // (status pasa a CANCELLED y deja de matchear PENDING+TRANSFER).
    await page.goto("/panel/pagos?type=transfers");
    await expect(
      page.getByText(new RegExp(planName, "i"))
    ).toHaveCount(0, { timeout: 10000 });
  });
});
