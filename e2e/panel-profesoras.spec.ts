import { test, expect } from "@playwright/test";

test.describe("Panel admin - Profesoras CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test("nueva profesora form has correct fields", async ({ page }) => {
    await page.goto("/panel/profesoras/nueva");
    await expect(
      page.getByRole("heading", { name: /agregar profesora/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /agregar profesora/i })
    ).toBeVisible();
  });
});
