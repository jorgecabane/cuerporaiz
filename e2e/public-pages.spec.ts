import { test, expect } from "@playwright/test";

test.describe("Páginas públicas", () => {
  test("membresía redirige a tienda o login", async ({ page }) => {
    await page.goto("/membresia");
    await expect(page).toHaveURL(/\/panel\/tienda|\/auth\/login/, { timeout: 15000 });
  });

  test("packs redirige a la biblioteca virtual", async ({ page }) => {
    await page.goto("/packs");
    await page.waitForURL(/\/catalogo/);
    await expect(
      page.getByRole("heading", { name: /biblioteca virtual/i })
    ).toBeVisible();
  });
});
