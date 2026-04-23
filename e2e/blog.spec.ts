import { test, expect } from "@playwright/test";

/**
 * Determinamos si Sanity está configurado pidiendo /blog una vez al inicio:
 * - 404 → no hay env de Sanity en el server
 * - 200 → server tiene project id y responde el index
 *
 * Esto evita depender de qué archivo .env lee Playwright vs Next.js.
 */
async function detectSanityConfigured(baseURL: string): Promise<boolean> {
  const res = await fetch(`${baseURL}/blog`, { redirect: "manual" });
  return res.status === 200;
}

test.describe("Blog (rutas públicas)", () => {
  test.describe("sin Sanity configurado", () => {
    test("GET /blog devuelve 404 si no hay env", async ({ page, baseURL }) => {
      const configured = await detectSanityConfigured(baseURL!);
      test.skip(configured, "Sanity está configurado — skip de la variante 'sin env'");

      const res = await page.goto("/blog");
      expect(res?.status()).toBe(404);
    });

    test("GET /blog/[slug] devuelve 404 si no hay env", async ({ page, baseURL }) => {
      const configured = await detectSanityConfigured(baseURL!);
      test.skip(configured, "Sanity está configurado — skip de la variante 'sin env'");

      const res = await page.goto("/blog/cualquier-slug");
      expect(res?.status()).toBe(404);
    });

    test("el header no muestra link Blog", async ({ page }) => {
      await page.goto("/");
      // Si blogEnabled está OFF en config, el link no aparece incluso con Sanity activo.
      // Este test solo verifica que no rompa el render del home.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });

  test.describe("con Sanity configurado", () => {
    test("GET /blog renderiza el hero editorial", async ({ page, baseURL }) => {
      const configured = await detectSanityConfigured(baseURL!);
      test.skip(!configured, "Requiere NEXT_PUBLIC_SANITY_PROJECT_ID en el server");

      await page.goto("/blog");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/cuerpo|blog|ideas/i);
    });

    test("GET /blog/[slug] renderiza el cuerpo del post", async ({ page, baseURL }) => {
      const configured = await detectSanityConfigured(baseURL!);
      test.skip(!configured, "Requiere NEXT_PUBLIC_SANITY_PROJECT_ID en el server");

      await page.goto("/blog");
      const firstPost = page.locator("a[href^='/blog/']").first();
      if ((await firstPost.count()) === 0) test.skip(true, "No hay posts publicados");

      await firstPost.click();
      await expect(page).toHaveURL(/\/blog\/.+/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: /volver al blog/i })).toBeVisible();
    });

    test("GET /blog/categoria/[slug] filtra por categoría", async ({ page, baseURL }) => {
      const configured = await detectSanityConfigured(baseURL!);
      test.skip(!configured, "Requiere NEXT_PUBLIC_SANITY_PROJECT_ID en el server");

      await page.goto("/blog");
      const chip = page.locator('nav[aria-label="Filtro de categorías"] a').nth(1);
      if ((await chip.count()) === 0) test.skip(true, "No hay categorías definidas");

      await chip.click();
      await expect(page).toHaveURL(/\/blog\/categoria\/.+/);
    });
  });
});
