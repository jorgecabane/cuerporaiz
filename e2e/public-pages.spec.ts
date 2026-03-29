import { test, expect } from "@playwright/test";

test.describe("Páginas públicas", () => {
  test("membresía redirige a tienda", async ({ page }) => {
    await page.goto("/membresia");
    await expect(page).toHaveURL(/\/panel\/tienda/, { timeout: 15000 });
  });

  test("packs redirige a catálogo", async ({ page }) => {
    await page.goto("/packs");
    await expect(page).toHaveURL(/\/catalogo/, { timeout: 15000 });
  });
});
