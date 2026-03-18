import { test, expect } from "@playwright/test";

test.describe("Panel admin - Profesores CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test("nuevo profesor form has correct fields", async ({ page }) => {
    await page.goto("/panel/profesores/nueva");
    await expect(
      page.getByRole("heading", { name: /agregar profesor/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /agregar profesor/i })
    ).toBeVisible();
  });
});
