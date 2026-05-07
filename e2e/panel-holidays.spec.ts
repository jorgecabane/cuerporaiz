import { test, expect } from "@playwright/test";
import { cleanupTier2Holidays } from "./helpers/cleanup";

/**
 * E2E del CRUD básico de feriados (admin).
 * Cubre crear y eliminar; el listado se verifica entre medio.
 */

test.describe("Panel admin — Feriados", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("feriados requiere login", async ({ page }) => {
      await page.goto("/panel/feriados");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe("CRUD", () => {
    test.describe.configure({ mode: "serial" });

    const labelPrefix = `E2E Feriado ${Date.now()}`;

    test.afterAll(async () => {
      await cleanupTier2Holidays(labelPrefix);
    });

    test("crear feriado y verificar que aparece en el listado", async ({ page }) => {
      await page.goto("/panel/feriados");
      await expect(page.getByRole("heading", { name: /^Feriados$/i })).toBeVisible({
        timeout: 15000,
      });

      // Calcular fecha futura única (offset por timestamp para evitar choques).
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const ymd = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;

      // Abrir form.
      await page.getByRole("button", { name: /agregar feriado/i }).click();
      await page.getByLabel(/fecha/i).fill(ymd);
      await page.getByLabel(/nombre/i).fill(labelPrefix);
      await page.getByRole("button", { name: /^guardar$/i }).click();

      // Aparece en el listado tras refresh.
      await expect(page.getByText(labelPrefix).first()).toBeVisible({ timeout: 10000 });
    });

    test("eliminar feriado lo saca del listado", async ({ page }) => {
      await page.goto("/panel/feriados");
      await expect(page.getByRole("heading", { name: /^Feriados$/i })).toBeVisible({
        timeout: 15000,
      });

      // Encontrar el row con nuestro label y clickear "Eliminar" → "Sí".
      const row = page
        .getByRole("listitem")
        .filter({ hasText: labelPrefix })
        .first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByRole("button", { name: /eliminar/i }).click();
      await row.getByRole("button", { name: /^sí$/i }).click();

      // Tras el delete (server action revalidate), el label desaparece.
      await expect(page.getByText(labelPrefix)).toHaveCount(0, { timeout: 10000 });
    });
  });
});
