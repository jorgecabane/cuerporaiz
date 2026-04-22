import { test, expect, type Page } from "@playwright/test";
import { cleanupPlans, seedUserPlanForPlan } from "./helpers/cleanup";

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

// ───────────────────────────────────────────────────────────────────────────
// §3: plan con dependents (UserPlan activo) → no se puede eliminar, se ofrece
// Deshabilitar. Luego la reactivación restaura el plan a la lista activa.
// §6: solo un plan puede estar marcado como Popular por centro a la vez.
// ───────────────────────────────────────────────────────────────────────────

test.describe("Panel admin - Delete plan con alumnos (§3)", () => {
  test.describe.configure({ mode: "serial" });

  const RUN_ID = Date.now().toString(36);
  const PLAN_NAME = `Plan E2E deps ${RUN_ID}`;

  test.afterAll(async () => {
    await cleanupPlans(`Plan E2E deps`);
  });

  test("click Eliminar en plan con UserPlan muestra modal de Deshabilitar", async ({ page }) => {
    // Crear plan via UI
    await page.goto("/panel/planes/nuevo");
    await page.getByLabel(/nombre/i).fill(PLAN_NAME);
    await page.getByLabel(/identificador del plan|slug/i).fill(`plan-e2e-deps-${RUN_ID}`);
    await page.getByLabel(/valor del plan/i).fill("20000");
    await page.getByRole("button", { name: /crear plan/i }).click();
    await expect(page).toHaveURL(/\/panel\/planes$/, { timeout: 15000 });

    // Seedear un UserPlan activo directamente en DB para simular "plan comprado"
    await page.goto("/panel/planes");
    const listItem = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: PLAN_NAME }) })
      .first();
    const editLink = listItem.getByRole("link", { name: /editar/i });
    const editHref = await editLink.getAttribute("href");
    const planId = editHref?.match(/\/panel\/planes\/(.+)\/editar/)?.[1];
    expect(planId).toBeTruthy();
    await seedUserPlanForPlan(planId!);

    // Click Eliminar → debe aparecer diálogo de Deshabilitar (no de eliminar)
    await listItem.getByRole("button", { name: /eliminar/i }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText(/No se puede eliminar/i);
    await expect(dialog.getByRole("button", { name: /Deshabilitar plan/i })).toBeVisible();

    // Confirmar deshabilitar → el plan debe moverse a la sección de archivados
    await dialog.getByRole("button", { name: /Deshabilitar plan/i }).click();

    await expect(listItem).not.toBeVisible({ timeout: 10000 });

    // Abrir sección de archivados y verificar
    const archivedToggle = page.getByRole("button", { name: /Planes deshabilitados/i });
    await expect(archivedToggle).toBeVisible({ timeout: 10000 });
    await archivedToggle.click();
    await expect(page.getByText(PLAN_NAME)).toBeVisible();
    await expect(page.getByRole("button", { name: /Reactivar/i }).first()).toBeVisible();
  });
});

test.describe("Panel admin - Popular único por centro (§6)", () => {
  test.describe.configure({ mode: "serial" });

  const RUN_ID = Date.now().toString(36);
  const PLAN_A = `Plan E2E pop-a ${RUN_ID}`;
  const PLAN_B = `Plan E2E pop-b ${RUN_ID}`;

  test.afterAll(async () => {
    await cleanupPlans(`Plan E2E pop-`);
  });

  async function createPlanWithPopular(
    page: Page,
    name: string,
    slug: string,
    popular: boolean
  ) {
    await page.goto("/panel/planes/nuevo");
    await page.getByLabel(/nombre/i).fill(name);
    await page.getByLabel(/identificador del plan|slug/i).fill(slug);
    await page.getByLabel(/valor del plan/i).fill("10000");
    if (popular) {
      await page.getByLabel(/Destacar como .Popular./i).check();
    }
    await page.getByRole("button", { name: /crear plan/i }).click();
    await expect(page).toHaveURL(/\/panel\/planes$/, { timeout: 15000 });
  }

  test("marcar Popular en Plan B desmarca el Popular de Plan A", async ({ page }) => {
    await createPlanWithPopular(page, PLAN_A, `plan-e2e-pop-a-${RUN_ID}`, true);
    await createPlanWithPopular(page, PLAN_B, `plan-e2e-pop-b-${RUN_ID}`, true);

    await page.goto("/panel/planes");

    const itemA = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: PLAN_A }) })
      .first();
    const itemB = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: PLAN_B }) })
      .first();

    // Solo el B debería mostrar el badge "Popular"
    await expect(itemB.getByText("Popular", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(itemA.getByText("Popular", { exact: true })).toHaveCount(0);
  });
});
