import { test, expect } from "@playwright/test";
import { snapshotTier2SiteConfig, restoreTier2SiteConfig } from "./helpers/cleanup";

/**
 * E2E del guardado de site config (admin → /panel/sitio?tab=branding).
 *
 * Cubre:
 *  - Cambiar el color primario, guardar y verificar persistencia tras reload.
 *
 * No verificamos efecto en la home pública porque puede sufrir caching ISR
 * y volverse flaky; la persistencia en el form admin es la verificación más
 * fuerte que podemos asegurar de forma estable.
 */
test.describe("Panel admin — Sitio (save & persist)", () => {
  test.describe.configure({ mode: "serial" });

  let snap: Awaited<ReturnType<typeof snapshotTier2SiteConfig>>;

  test.beforeAll(async () => {
    snap = await snapshotTier2SiteConfig("e2e-test");
  });

  test.afterAll(async () => {
    if (snap) {
      await restoreTier2SiteConfig("e2e-test", snap);
    }
  });

  test("cambiar color primario, guardar y persistir tras reload", async ({ page }) => {
    test.skip(!snap, "Sin DB en este worker");

    // El input type=color normaliza a lowercase, así que el valor distintivo
    // viene en lower para que el toHaveValue compare exacto.
    const newPrimary = "#7e1f86";

    await page.goto("/panel/sitio?tab=branding");
    await expect(page.getByRole("heading", { name: /sitio web/i })).toBeVisible({
      timeout: 15000,
    });

    // El input color primario está marcado con aria-label="Color primario".
    const primaryInput = page.getByLabel(/color primario/i);
    await expect(primaryInput).toBeVisible();
    await primaryInput.fill(newPrimary);

    // Guardar.
    await page.getByRole("button", { name: /guardar cambios/i }).click();
    await expect(page.getByText(/cambios guardados/i)).toBeVisible({ timeout: 10000 });

    // Reload y verificar que el valor se persistió.
    await page.reload();
    await expect(page.getByRole("heading", { name: /sitio web/i })).toBeVisible({
      timeout: 15000,
    });
    const reloadedInput = page.getByLabel(/color primario/i);
    await expect(reloadedInput).toHaveValue(newPrimary, { timeout: 10000 });
  });
});
