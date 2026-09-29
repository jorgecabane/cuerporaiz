import { test, expect } from "@playwright/test";

/**
 * Camino de compra de la Biblioteca Virtual:
 * catálogo público (pack con precio) → "Comprar pack" → login/registro
 * conservando callbackUrl → tienda con el plan destacado.
 * La seed crea un plan MEMBERSHIP_ON_DEMAND y categorías publicadas.
 */

test.describe("Biblioteca — compra de pack (sin sesión)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("el catálogo muestra el pack con precio y un Comprar que conserva el plan", async ({ page }) => {
    await page.goto("/catalogo");
    const buy = page.getByRole("link", { name: /Comprar pack/i }).first();
    await expect(buy).toBeVisible();
    await expect(page.getByText(/Pago seguro a través de MercadoPago/i).first()).toBeVisible();

    const href = await buy.getAttribute("href");
    expect(href).toMatch(/^\/auth\/login\?callbackUrl=%2Fpanel%2Ftienda%3Fplan%3D/);

    await buy.click();
    await page.waitForURL(/\/auth\/login/);
    const signup = page.getByRole("link", { name: /Registrarse/i });
    await expect(signup).toHaveAttribute("href", /\/auth\/signup\?callbackUrl=%2Fpanel%2Ftienda%3Fplan%3D/);
  });

  test("entrar directo a /panel/tienda?plan= redirige a login sin perder el plan", async ({ page }) => {
    await page.goto("/panel/tienda?plan=abc123");
    await page.waitForURL(/\/auth\/login/);
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe("/panel/tienda?plan=abc123");
  });

  test("login ignora callbackUrl externos", async ({ page }) => {
    await page.goto("/auth/login?callbackUrl=%2F%2Fevil.com");
    await expect(page.getByRole("link", { name: /Registrarse/i })).toHaveAttribute("href", "/auth/signup");
  });
});

test.describe("Biblioteca — tienda con plan preseleccionado (con sesión)", () => {
  test("destaca el plan de ?plan= y muestra lo que incluye", async ({ page }) => {
    await page.goto("/catalogo");
    const href = await page.getByRole("link", { name: /Comprar pack/i }).first().getAttribute("href");
    const callback = new URL(href!, "http://x").searchParams.get("callbackUrl")!;

    await page.goto(callback);
    await expect(page.getByRole("heading", { name: /Planes disponibles/i })).toBeVisible();
    const highlighted = page.locator("li.ring-2");
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted.getByText(/Acceso a toda la biblioteca|clases? de/i)).toBeVisible();
  });
});
