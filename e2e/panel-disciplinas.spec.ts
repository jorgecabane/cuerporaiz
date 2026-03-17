import { test, expect } from "@playwright/test";

test.describe("Panel admin - Disciplinas CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test("nueva disciplina form has correct fields", async ({ page }) => {
    await page.goto("/panel/disciplinas/nueva");
    await expect(
      page.getByRole("heading", { name: /nueva disciplina/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /crear disciplina/i })
    ).toBeVisible();
  });

  test("admin puede crear una disciplina", async ({ page }) => {
    const name = `E2E Disciplina ${Date.now()}`;
    await page.goto("/panel/disciplinas/nueva");
    await page.getByLabel(/nombre/i).fill(name);
    await page.getByRole("button", { name: /crear disciplina/i }).click();
    await expect(page).toHaveURL(/\/panel\/disciplinas/, { timeout: 10000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 20000 });
  });
});
