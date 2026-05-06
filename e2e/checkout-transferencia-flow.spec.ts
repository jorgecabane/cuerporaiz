import { test, expect } from "@playwright/test";
import {
  snapshotBankTransfer,
  setBankTransfer,
  seedPlan,
  cleanupPlans,
  cleanupPendingTransferOrders,
} from "./helpers/cleanup";

/**
 * Flow del estudiante para pagar un plan vía transferencia bancaria,
 * end-to-end (sin upload real a Sanity).
 *
 * Setup:
 * - Plugin de transferencia activo + datos bancarios completos.
 * - `requireReceipt=false` para no depender de Sanity en el upload.
 * - Plan seedeado vía Prisma (no UI form, evita acoplar al PlanForm).
 *
 * El flow: /panel/tienda → "Comprar" → /checkout/[orderId] → switchea
 * a transferencia → "Ya transferí" → /panel/mis-pagos con banner verde.
 *
 * Notas:
 * - Usa la storageState de admin (default chromium project). El admin
 *   también puede comprar planes a nivel modelo.
 * - No verifica el mail enviado (sería test de Resend, fuera de scope).
 */
test.describe("Checkout transferencia — flow estudiante", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let planName: string;
  let snapshot: Awaited<ReturnType<typeof snapshotBankTransfer>>;
  let plan: Awaited<ReturnType<typeof seedPlan>>;

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    planName = `E2E TX Plan ${runId}`;
    snapshot = await snapshotBankTransfer("e2e-test");
    await setBankTransfer("e2e-test", {
      enabled: true,
      acceptPlans: true,
      requireReceipt: false,
      bankName: "BancoEstado",
      bankAccountType: "Cuenta Vista",
      bankAccountNumber: "12345678",
      bankAccountHolder: "Centro E2E",
      bankAccountRut: "12.345.678-9",
      bankAccountEmail: "pagos@e2e.test",
    });
    plan = await seedPlan({ centerSlug: "e2e-test", name: planName });
  });

  test.afterAll(async () => {
    if (snapshot) {
      await setBankTransfer("e2e-test", snapshot);
    }
    await cleanupPendingTransferOrders("e2e-tx-");
    await cleanupPlans(planName);
  });

  test("plugin habilitado: comprar plan → selector → confirmar transferencia", async ({ page }) => {
    test.skip(!snapshot || !plan, "Sin DB en este worker");

    await page.goto("/panel/tienda");
    await expect(page.getByRole("heading", { name: /^Planes$/i })).toBeVisible({
      timeout: 15000,
    });

    // Encontrar el <li> del plan seedeado (estructura de TiendaPlans) por su
    // heading con el nombre exacto, y hacer click en su Comprar.
    const planCard = page
      .locator("li")
      .filter({
        has: page.getByRole("heading", { name: new RegExp(planName, "i") }),
      })
      .first();
    await expect(planCard).toBeVisible({ timeout: 15000 });
    await planCard.scrollIntoViewIfNeeded();
    await planCard.getByRole("button", { name: /Comprar/i }).click();

    // 1. Debe redirigir al nuevo selector de checkout.
    await page.waitForURL(/\/checkout\/[a-z0-9]+$/i, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /^Pagar$/i })).toBeVisible({
      timeout: 10000,
    });

    // 2. Switchea a transferencia.
    await page.getByRole("button", { name: /Transferencia bancaria/i }).click();
    await expect(page.getByText(/Cuenta de destino/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/BancoEstado/i)).toBeVisible();
    await expect(page.getByText(/12345678/i).first()).toBeVisible();

    // 3. Click "Ya transferí" (no requiere comprobante por config del test).
    await page.getByRole("button", { name: /Ya transfer[ií]/i }).click();

    // 4. Redirige a /panel/mis-pagos?recien=ORDER_ID con banner verde.
    await page.waitForURL(/\/panel\/mis-pagos\?recien=/, { timeout: 15000 });
    await expect(
      page.getByText(/Tu transferencia fue registrada/i)
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Esperando confirmaci[oó]n/i).first()
    ).toBeVisible();
  });

  test("/checkout con orderId inexistente muestra not-found", async ({ page }) => {
    const response = await page.goto("/checkout/non-existent-order-id");
    // notFound() devuelve 404 o renderiza el not-found.tsx (status 404).
    // Aceptamos: status 404, OR contenido de página de error, OR redirect a auth/panel.
    const url = page.url();
    if (/\/(panel|auth)/.test(url)) return; // redirect ok
    expect(response?.status() ?? 200).toBe(404);
  });
});
