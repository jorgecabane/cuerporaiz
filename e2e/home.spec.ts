import { test, expect } from "@playwright/test";

test.describe("Home", () => {
  test("carga la página principal y muestra el hero", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");

    await expect(page).toHaveTitle(/Centro E2E/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("cuerpo");
    await expect(page.getByRole("link", { name: /seguir leyendo/i })).toBeVisible();
  });
});
