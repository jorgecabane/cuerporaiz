import { test, expect } from "@playwright/test";

test.describe("Home dinámico", () => {
  test("carga con datos del centro y muestra el hero", async ({ page }) => {
    await page.goto("/");
    // Hero should contain seeded title content (check for a word from the seeded hero title)
    // The seed uses the original hardcoded text, so check for that
    await expect(page.locator("text=/cuerpo|respiración|placer/i").first()).toBeVisible({ timeout: 15000 });
  });

  test("muestra múltiples secciones del home", async ({ page }) => {
    await page.goto("/");
    // Should have at least the hero and some other sections visible
    await expect(page.locator("section").first()).toBeVisible({ timeout: 15000 });
    // Check there are multiple sections rendered
    const sections = page.locator("section");
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
