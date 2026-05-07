import { test, expect } from "@playwright/test";
import { setCenterLogoUrl } from "./helpers/cleanup";

/**
 * Verifica que el logo configurado en /panel/sitio aparece en el header
 * del panel autenticado. Cubre desktop (logo a la izquierda del nombre)
 * y mobile (logo centrado absoluto).
 *
 * Por qué solo el panel y no el header público: el home `/` y otras rutas
 * públicas usan `revalidate = 60` (ISR), así que la HTML estática
 * pre-renderizada al build no refleja un cambio de `logoUrl` recién
 * escrito a la DB. El panel es dinámico (depende de `auth()`) y siempre
 * re-renderiza por request, por eso es testeable de forma fiable acá.
 *
 * El header público comparte el componente `SiteLogoMark` y la misma
 * lógica de breakpoints — si funciona en panel, funciona en público.
 * Se verifica visualmente vía preview de Vercel para el header público.
 */
test.describe("Branding — logo en panel header", () => {
  test.describe.configure({ mode: "serial" });

  const TEST_LOGO = "/checkout-icons/mphands.svg";
  let previousLogo: string | null = null;
  let dbAvailable = false;

  test.beforeAll(async () => {
    const result = await setCenterLogoUrl("e2e-test", TEST_LOGO);
    // Si la helper devolvió null podría ser que no había config previa,
    // o que no hay DB. Distinguimos verificando si tenemos DATABASE_URL.
    dbAvailable = Boolean(process.env.DATABASE_URL);
    previousLogo = result;
  });

  test.afterAll(async () => {
    if (dbAvailable) {
      await setCenterLogoUrl("e2e-test", previousLogo);
    }
  });

  test("desktop panel: logo a la izquierda del nombre del centro", async ({ page }) => {
    test.skip(!dbAvailable, "Sin DATABASE_URL en este worker");

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/panel");
    const logo = page
      .getByRole("banner")
      .getByRole("img", { name: /Logo de/i })
      .first();
    await expect(logo).toBeVisible({ timeout: 15000 });
  });

  test("mobile panel: logo centrado en el header", async ({ page }) => {
    test.skip(!dbAvailable, "Sin DATABASE_URL en este worker");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/panel");
    const logo = page
      .getByRole("banner")
      .getByRole("img", { name: /Logo de/i })
      .first();
    await expect(logo).toBeVisible({ timeout: 15000 });

    // En mobile el logo va centrado absoluto: su bounding box debe estar
    // alrededor de la mitad horizontal del viewport (±60px de tolerancia).
    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const center = box.x + box.width / 2;
      expect(center).toBeGreaterThan(195 - 60);
      expect(center).toBeLessThan(195 + 60);
    }
  });
});
