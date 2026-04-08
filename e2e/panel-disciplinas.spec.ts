import { test, expect } from "@playwright/test";
import { cleanupDisciplines } from "./helpers/cleanup";

test.describe("Panel admin - Disciplinas CRUD", () => {
  test.describe.configure({ mode: "serial" });

  let e2eDisciplineName: string | null = null;

  // Safety net: clean up even if UI cleanup test fails
  test.afterAll(async () => {
    if (e2eDisciplineName) await cleanupDisciplines(e2eDisciplineName);
  });

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
    e2eDisciplineName = name;
    await page.goto("/panel/disciplinas/nueva");
    await page.getByLabel(/nombre/i).fill(name);
    await page.getByRole("button", { name: /crear disciplina/i }).click();
    await expect(page).toHaveURL(/\/panel\/disciplinas/, { timeout: 10000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 20000 });
  });

  test("cleanup: elimina la disciplina creada por E2E", async ({ page }) => {
    if (!e2eDisciplineName) return;
    await page.goto("/panel/disciplinas");
    await expect(page.getByRole("heading", { name: /Disciplinas/i })).toBeVisible({ timeout: 10000 });
    const listItem = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: e2eDisciplineName }) });
    if (!(await listItem.isVisible())) return;
    await listItem.getByRole("button", { name: /Eliminar/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /Eliminar/i }).click();
    await expect(page.getByText(e2eDisciplineName)).not.toBeVisible({ timeout: 5000 });
  });
});
