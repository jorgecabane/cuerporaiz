import { test, expect } from "@playwright/test";

test.describe("Panel admin - Planes", () => {
  test.describe.configure({ mode: "serial" });

  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("panel/planes requiere login", async ({ page }) => {
      await page.goto("/panel/planes");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin llega a planes y ve heading", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: /^Planes$/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /^Planes$/i }).first().click();
    await expect(page).toHaveURL(/\/panel\/planes/);
    await expect(page.getByRole("heading", { name: /Planes \(admin\)/i })).toBeVisible();
  });

  test("admin puede crear un plan", async ({ page }) => {
    const planName = `Plan E2E ${Date.now()}`;

    await page.goto("/panel/planes");
    await expect(page).toHaveURL(/\/panel\/planes/);
    await page.getByRole("link", { name: /nuevo plan/i }).click();
    await expect(page).toHaveURL(/\/panel\/planes\/nuevo/);

    await page.getByLabel(/nombre/i).fill(planName);
    await page.getByLabel(/valor del plan/i).fill("15000");
    await page.getByRole("button", { name: /crear plan/i }).click();

    await expect(page).toHaveURL(/\/panel\/planes/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: planName })).toBeVisible({ timeout: 10000 });
  });

  test("admin puede editar un plan", async ({ page }) => {
    await page.goto("/panel/planes");
    await expect(page.getByRole("heading", { name: /Planes/i })).toBeVisible({ timeout: 10000 });

    const editLink = page.getByRole("link", { name: /editar/i }).first();
    if (!(await editLink.isVisible())) {
      test.skip();
      return;
    }
    await editLink.click();
    await expect(page).toHaveURL(/\/panel\/planes\/.+\/editar/, { timeout: 15000 });

    const nameInput = page.getByLabel(/nombre/i);
    await nameInput.fill("");
    await nameInput.fill("Plan E2E editado");
    await page.getByRole("button", { name: /guardar cambios/i }).click();

    await expect(page).toHaveURL(/\/panel\/planes/);
    await expect(page.getByRole("heading", { name: "Plan E2E editado" }).first()).toBeVisible();
  });

  test("admin puede eliminar un plan", async ({ page }) => {
    await page.goto("/panel/planes");
    await expect(page).toHaveURL(/\/panel\/planes/);

    const deleteBtn = page.getByRole("button", { name: /eliminar|borrar/i }).first();
    if (!(await deleteBtn.isVisible())) {
      test.skip();
      return;
    }
    page.once("dialog", (dialog) => dialog.accept());
    await deleteBtn.click();

    await expect(page).toHaveURL(/\/panel\/planes/);
  });
});
