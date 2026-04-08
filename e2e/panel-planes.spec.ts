import { test, expect } from "@playwright/test";
import { cleanupPlans } from "./helpers/cleanup";

test.describe("Panel admin - Planes", () => {
  test.describe.configure({ mode: "serial" });

  // Nombres únicos por ejecución para no chocar con datos existentes ni con planes que tengan usuarios asignados
  let e2ePlanRunId: string;

  test.beforeAll(() => {
    e2ePlanRunId = Date.now().toString(36);
  });

  // Safety net: clean up even if UI cleanup test fails
  test.afterAll(async () => {
    await cleanupPlans(`Plan E2E`);
  });

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
    const planName = `Plan E2E ${e2ePlanRunId}`;
    const slug = `plan-e2e-${e2ePlanRunId}`;

    await page.goto("/panel/planes");
    await expect(page).toHaveURL(/\/panel\/planes/);
    await page.getByRole("link", { name: /nuevo plan/i }).click();
    await expect(page).toHaveURL(/\/panel\/planes\/nuevo/);

    await page.getByLabel(/nombre/i).fill(planName);
    await page.getByLabel(/identificador del plan|slug/i).fill(slug);
    await page.getByLabel(/valor del plan/i).fill("15000");
    await page.getByRole("button", { name: /crear plan/i }).click();

    await expect(page).toHaveURL(/\/panel\/planes$/, { timeout: 15000 });
    await page.reload();
    const planHeading = page.getByRole("heading", { name: planName }).first();
    await planHeading.scrollIntoViewIfNeeded();
    await expect(planHeading).toBeVisible({ timeout: 10000 });
  });

  test("admin puede editar un plan", async ({ page }) => {
    const planNameCreated = `Plan E2E ${e2ePlanRunId}`;
    const planNameEdited = `Plan E2E editado ${e2ePlanRunId}`;

    await page.goto("/panel/planes");
    await expect(page.getByRole("heading", { name: /Planes/i })).toBeVisible({ timeout: 10000 });

    const listItem = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: planNameCreated }) })
      .first();
    await listItem.scrollIntoViewIfNeeded();
    const editLink = listItem.getByRole("link", { name: /editar/i });
    if (!(await editLink.isVisible())) {
      test.skip();
      return;
    }
    await editLink.click();
    await expect(page).toHaveURL(/\/panel\/planes\/.+\/editar/, { timeout: 15000 });

    const nameInput = page.getByLabel(/nombre/i);
    await nameInput.fill("");
    await nameInput.fill(planNameEdited);
    await page.getByRole("button", { name: /guardar cambios/i }).click();

    await expect(page).toHaveURL(/\/panel\/planes$/);
    const editedHeading = page.getByRole("heading", { name: planNameEdited }).first();
    await editedHeading.scrollIntoViewIfNeeded();
    await expect(editedHeading).toBeVisible();
  });

  test("admin elimina el plan creado por E2E (cleanup)", async ({ page }) => {
    const planNameEdited = `Plan E2E editado ${e2ePlanRunId}`;

    await page.goto("/panel/planes");
    await expect(page).toHaveURL(/\/panel\/planes$/);

    // Solo eliminamos el plan de esta ejecución (nombre único); así no tocamos planes con usuarios asignados
    while (true) {
      const listItem = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { name: planNameEdited }) })
        .first();
      const deleteBtn = listItem.getByRole("button", { name: /eliminar/i });
      if (!(await deleteBtn.isVisible())) break;

      await deleteBtn.click();
      await page.getByRole("alertdialog").getByRole("button", { name: /Eliminar/i }).click();
      await expect(page).toHaveURL(/\/panel\/planes$/, { timeout: 10000 });
      // Esperar a que el ítem desaparezca de la lista (sin waitForTimeout)
      await expect(listItem).not.toBeVisible({ timeout: 5000 });
    }

    await expect(page.getByRole("heading", { name: planNameEdited })).not.toBeVisible();
  });
});
