import { test, expect } from "@playwright/test";
import { cleanupTier2ManualPayments } from "./helpers/cleanup";

/**
 * E2E del registro manual de pagos por parte del admin.
 *
 * Hallazgo: el botón "Registrar pago manual" NO vive en /panel/pagos. La
 * funcionalidad existe en `/panel/clientes/[id]` (form en `RegisterManualPayment`).
 * Tras registrar el pago, queda visible en /panel/pagos?type=manual filtrando
 * por email del cliente, y también en la sección "Pagos manuales" del cliente.
 *
 * Este spec cubre:
 *  1. Crear un pago manual desde la ficha del estudiante seedeado.
 *  2. Verificar que aparece en /panel/pagos?type=manual con la nota.
 */

const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? "student@e2e.test";

test.describe("Panel admin — Registro manual de pago", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let note: string;

  test.beforeAll(() => {
    runId = Date.now().toString(36);
    note = `E2E manual ${runId}`;
  });

  test.afterAll(async () => {
    await cleanupTier2ManualPayments(note);
  });

  test("admin registra pago manual desde la ficha del estudiante", async ({ page }) => {
    // 1. Ir al listado de clientes y abrir la ficha del student seedeado.
    await page.goto("/panel/clientes");
    await expect(page.getByRole("heading", { name: /^Estudiantes$/i })).toBeVisible({
      timeout: 15000,
    });

    // El listado muestra al estudiante; el Link contiene name o email del seed.
    const studentLink = page
      .getByRole("link", { name: new RegExp(`Student E2E|${STUDENT_EMAIL}`, "i") })
      .first();
    await expect(studentLink).toBeVisible({ timeout: 10000 });
    await studentLink.click();

    await expect(page).toHaveURL(/\/panel\/clientes\/[a-z0-9]+/i, { timeout: 15000 });

    // 2. Abrir el form "Registrar pago manual".
    await page.getByRole("button", { name: /\+ Registrar pago manual/i }).click();
    await expect(page.getByRole("heading", { name: /registrar pago manual/i }).or(page.getByText(/registrar pago manual/i)).first()).toBeVisible();

    // 3. Llenar y enviar.
    await page.getByLabel(/monto/i).fill("12500");
    await page.getByLabel(/método/i).selectOption("cash");
    await page.getByLabel(/nota/i).fill(note);
    await page.getByRole("button", { name: /registrar pago/i }).click();

    // El form se cierra y aparece el item en la lista de pagos manuales del cliente.
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 10000 });
  });

  test("el pago manual aparece en /panel/pagos?type=manual con la nota", async ({ page }) => {
    await page.goto(`/panel/pagos?type=manual&email=${encodeURIComponent(STUDENT_EMAIL)}`);
    await expect(page.getByRole("heading", { name: /^Pagos$/i })).toBeVisible({
      timeout: 15000,
    });
    // Tab "Manual" activo.
    await expect(page.getByRole("link", { name: /^Manual$/i })).toBeVisible();
    // El pago con nuestra nota aparece en la tabla.
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 10000 });
  });
});
