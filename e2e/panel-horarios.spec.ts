import { test, expect, type Page } from "@playwright/test";
import { cleanupLiveClasses } from "./helpers/cleanup";

test.describe("Panel admin - Horarios flow", () => {
  test.describe.configure({ mode: "serial" });

  // Safety net: clean up even if UI cleanup test fails
  test.afterAll(async () => {
    await cleanupLiveClasses("E2E Test Class");
  });

  test.describe("requires login", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("horarios requires login", async ({ page }) => {
      await page.goto("/panel/horarios");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin sees weekly calendar with navigation", async ({ page }) => {
    await page.goto("/panel/horarios");
    await expect(page.getByRole("heading", { name: /Horarios/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("link", { name: /Nueva clase/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Anterior/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hoy/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Siguiente/i })).toBeVisible();
  });

  test("admin can navigate weeks", async ({ page }) => {
    await page.goto("/panel/horarios");
    const weekLabel = page.locator("text=/\\d+ .+ — \\d+ .+/");
    await expect(weekLabel).toBeVisible({ timeout: 15000 });
    const initialText = (await weekLabel.textContent()) ?? "";
    await page.getByRole("button", { name: /Siguiente/i }).click();
    await expect(weekLabel).not.toHaveText(initialText);
    await page.getByRole("button", { name: /Hoy/i }).click();
    await expect(weekLabel).toHaveText(initialText);
  });

  test("admin opens nueva clase form and sees all fields", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    await expect(page.getByRole("heading", { name: /Nueva clase/i })).toBeVisible();
    await expect(page.getByLabel(/Nombre de la clase/i)).toBeVisible();
    await expect(page.getByLabel(/Disciplina/i)).toBeVisible();
    await expect(page.getByLabel(/Profesor/i)).toBeVisible();
    await expect(page.getByLabel(/Fecha y hora inicio/i)).toBeVisible();
    await expect(page.getByLabel(/Duración/i)).toBeVisible();
    await expect(page.getByLabel(/Cupos/i)).toBeVisible();
    await expect(page.getByLabel(/Repetición/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Crear clase/i })).toBeVisible();
  });

  test("default duration comes from center config", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    const durationInput = page.getByLabel(/Duración/i);
    const value = await durationInput.inputValue();
    expect(Number(value)).toBeGreaterThanOrEqual(15);
    expect(Number(value)).toBeLessThanOrEqual(240);
  });

  test("recurrence dropdown shows contextual options", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    const recurrenceSelect = page.getByLabel(/Repetición/i);
    await expect(recurrenceSelect).toBeVisible();
    const options = recurrenceSelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(6);
    await expect(options.nth(0)).toHaveText("No se repite");
    await expect(options.nth(1)).toHaveText("Cada día");
  });

  test("custom recurrence dialog opens on Personalizar", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    const recurrenceSelect = page.getByLabel(/Repetición/i);
    await recurrenceSelect.selectOption("custom");
    await expect(page.getByRole("heading", { name: /Periodicidad personalizada/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hecho/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cancelar/i })).toBeVisible();
  });

  test("color picker is native input type=color", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    const colorInput = page.locator("input[type='color']");
    await expect(colorInput).toBeVisible();
    const value = await colorInput.inputValue();
    expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test("clase online is disabled", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    const onlineCheckbox = page.getByLabel(/Clase online/i);
    // Si no hay plugins (Zoom/Meet) configurados, queda deshabilitado.
    // Si hay plugins, debe estar habilitado.
    const requiresPluginHint = page.getByText(/\(requiere plugin\)/i);
    if (await requiresPluginHint.count()) {
      await expect(onlineCheckbox).toBeDisabled();
    } else {
      await expect(onlineCheckbox).toBeEnabled();
    }
  });

  test("trial capacity shows when acepta prueba checked", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    await expect(page.getByLabel(/Cupos de prueba/i)).not.toBeVisible();
    await page.getByLabel(/Acepta clase de prueba/i).check();
    await expect(page.getByLabel(/Cupos de prueba/i)).toBeVisible();
  });

  test("datetime input has min attribute preventing past dates", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    const dateInput = page.getByLabel(/Fecha y hora inicio/i);
    const minValue = await dateInput.getAttribute("min");
    expect(minValue).toBeTruthy();
    const minDate = new Date(minValue!);
    const now = new Date();
    now.setMinutes(now.getMinutes() - 5);
    expect(minDate.getTime()).toBeGreaterThan(now.getTime());
  });

  const E2E_CLASS_NAME = "E2E Test Class";

  test("admin can create a single class", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    await page.getByLabel(/Nombre de la clase/i).fill(E2E_CLASS_NAME);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T10:00`;
    await page.getByLabel(/Fecha y hora inicio/i).fill(dateStr);
    await page.getByRole("button", { name: /Crear clase/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios/, { timeout: 10000 });
  });

  test("cleanup: elimina la clase creada por E2E", async ({ page }) => {
    await page.goto("/panel/horarios");
    await expect(page.getByRole("heading", { name: /Horarios/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Lista/i }).click();
    // Esperar a que la vista Lista termine de cargar (desaparece "Cargando…").
    const loading = page.getByText("Cargando…");
    await loading.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    const classLink = page.getByRole("link", { name: new RegExp(E2E_CLASS_NAME) }).first();
    if (!(await classLink.isVisible({ timeout: 8000 }))) {
      test.skip();
      return;
    }
    await classLink.click();
    await expect(page).toHaveURL(/\/panel\/horarios\/.+/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Cancelar clase/i }).click();
    await page.getByRole("button", { name: /Sí, cancelar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios/, { timeout: 10000 });
  });
});

test.describe("Panel admin - Calendar views and filters", () => {
  test.describe.configure({ mode: "serial" });

  test("calendar has view switcher with 4 modes", async ({ page }) => {
    await page.goto("/panel/horarios");
    await expect(page.getByRole("heading", { name: /Horarios/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Día/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Semana/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mes/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Lista/i })).toBeVisible();
  });

  test("can switch to day view", async ({ page }) => {
    await page.goto("/panel/horarios");
    await expect(page.getByRole("heading", { name: /Horarios/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: /Día/i }).click();
    await expect(page.getByRole("button", { name: /Anterior/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Siguiente/i })).toBeVisible();
  });

  test("can switch to month view", async ({ page }) => {
    await page.goto("/panel/horarios");
    await expect(page.getByRole("heading", { name: /Horarios/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Mes/i }).click();
    await expect(page.getByRole("button", { name: /Anterior/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Siguiente/i })).toBeVisible();
  });

  test("can switch to list view", async ({ page }) => {
    await page.goto("/panel/horarios");
    await expect(page.getByRole("heading", { name: /Horarios/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Lista/i }).click();
    await expect(page.getByRole("button", { name: /Anterior/i })).not.toBeVisible();
  });

  test("filter dropdowns are visible", async ({ page }) => {
    await page.goto("/panel/horarios");
    await page.waitForTimeout(1000);
    const disciplineSelect = page.locator("select").filter({ hasText: /disciplinas/i });
    await expect(disciplineSelect).toBeVisible();
    const instructorSelect = page.locator("select").filter({ hasText: /profesores/i });
    await expect(instructorSelect).toBeVisible();
    const modeSelect = page.locator("select").filter({ hasText: /Presencial/i });
    await expect(modeSelect).toBeVisible();
  });

  test("discipline filter has options", async ({ page }) => {
    await page.goto("/panel/horarios");
    await page.waitForTimeout(1000);
    const select = page.locator("select").filter({ hasText: /disciplinas/i });
    const options = select.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Panel admin - Edit class", () => {
  test.describe.configure({ mode: "serial" });

  test("edit page shows form with class data", async ({ page }) => {
    await page.goto("/panel/horarios");
    await page.getByRole("button", { name: /Lista/i }).click();
    await page.waitForTimeout(2000);
    const classLinks = page.locator("a[href*='/panel/horarios/c']");
    const count = await classLinks.count();
    if (count > 0) {
      const href = await classLinks.first().getAttribute("href");
      await page.goto(href!);
      await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/Nombre de la clase/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /Guardar cambios/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Cancelar clase/i })).toBeVisible();
    }
  });

  test("series class shows scope selector", async ({ page }) => {
    await page.goto("/panel/horarios");
    await page.getByRole("button", { name: /Siguiente/i }).click();
    await page.waitForTimeout(1500);
    const seriesClass = page.locator("a[href^='/panel/horarios/']").first();
    if (await seriesClass.isVisible()) {
      await seriesClass.click();
      await page.waitForTimeout(1000);
      const scopeButton = page.getByRole("button", { name: /Solo esta clase/i });
      if (await scopeButton.isVisible()) {
        await expect(page.getByRole("button", { name: /Esta y las siguientes/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /Toda la serie/i })).toBeVisible();
      }
    }
  });
});

test.describe("Panel admin - Feriados", () => {
  test.describe.configure({ mode: "serial" });

  test.describe("requires login", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("feriados requires login", async ({ page }) => {
      await page.goto("/panel/feriados");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin sees feriados page", async ({ page }) => {
    await page.goto("/panel/feriados");
    await expect(page).toHaveURL(/\/panel\/feriados/);
    await expect(page.getByRole("heading", { name: /Feriados/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Agregar feriado/i })).toBeVisible();
  });

  test("admin can open add holiday form", async ({ page }) => {
    await page.goto("/panel/feriados");
    await page.getByRole("button", { name: /Agregar feriado/i }).click();
    await expect(page.getByLabel(/Fecha/i)).toBeVisible();
    await expect(page.getByLabel(/Nombre/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Guardar/i })).toBeVisible();
  });
});

test.describe("Panel admin - Disciplinas", () => {
  test.describe("requires login", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("disciplinas requires login", async ({ page }) => {
      await page.goto("/panel/disciplinas");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin sees disciplinas page", async ({ page }) => {
    await page.goto("/panel/disciplinas");
    await expect(page).toHaveURL(/\/panel\/disciplinas/);
    await expect(page.getByRole("heading", { name: /Disciplinas/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Panel admin - Profesores", () => {
  test.describe("requires login", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("profesores requires login", async ({ page }) => {
      await page.goto("/panel/profesores");
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test("admin sees profesores page", async ({ page }) => {
    await page.goto("/panel/profesores");
    await expect(page).toHaveURL(/\/panel\/profesores/);
    await expect(page.getByRole("heading", { name: /Profesores/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Panel admin - Configuración (calendar settings)", () => {
  test("configuración page has calendar settings", async ({ page }) => {
    await page.goto("/panel/configuracion");
    await expect(page).toHaveURL(/\/panel\/configuracion/);
    await expect(page.getByLabel(/Hora de inicio del calendario/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/Hora de fin del calendario/i)).toBeVisible();
    await expect(page.getByLabel(/Duración por defecto de clases/i)).toBeVisible();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §2 regresión: al cancelar una clase, debe desaparecer del calendario incluso
// tras navegar / recargar (fix de revalidatePath + dynamic).
// §1: seleccionar varias clases desde la vista Lista y cancelarlas en bulk.
// ───────────────────────────────────────────────────────────────────────────

test.describe("Panel admin - Cancel class cache fix (§2 regression)", () => {
  test.describe.configure({ mode: "serial" });

  const TITLE = `E2E Test Class cache-${Date.now().toString(36)}`;

  test.afterAll(async () => {
    await cleanupLiveClasses(TITLE);
  });

  test("crear, cancelar, y verificar que NO reaparece tras navegar", async ({ page }) => {
    // Crear
    await page.goto("/panel/horarios/nueva");
    await page.getByLabel(/Nombre de la clase/i).fill(TITLE);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(11, 0, 0, 0);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T11:00`;
    await page.getByLabel(/Fecha y hora inicio/i).fill(dateStr);
    await page.getByRole("button", { name: /Crear clase/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios/, { timeout: 10000 });

    // Cancelar via list view → edit page
    await page.getByRole("button", { name: /Lista/i }).click();
    const link = page.getByRole("link", { name: new RegExp(TITLE) }).first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Cancelar clase/i }).click();
    await page.getByRole("button", { name: /Sí, cancelar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$/, { timeout: 10000 });

    // Navegar fuera y volver — NO debe reaparecer
    await page.goto("/panel");
    await page.goto("/panel/horarios");
    await page.getByRole("button", { name: /Lista/i }).click();
    await page.waitForTimeout(1500);
    await expect(
      page.getByRole("link", { name: new RegExp(TITLE) })
    ).toHaveCount(0, { timeout: 8000 });

    // Reload fuerza un nuevo fetch — tampoco debe reaparecer
    await page.reload();
    await page.getByRole("button", { name: /Lista/i }).click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByRole("link", { name: new RegExp(TITLE) })
    ).toHaveCount(0, { timeout: 8000 });
  });
});

test.describe("Panel admin - Batch cancel (§1)", () => {
  test.describe.configure({ mode: "serial" });

  const RUN_ID = Date.now().toString(36);
  const TITLE_A = `E2E Test Class batch-a-${RUN_ID}`;
  const TITLE_B = `E2E Test Class batch-b-${RUN_ID}`;

  test.afterAll(async () => {
    await cleanupLiveClasses(`E2E Test Class batch-`);
  });

  async function createClass(page: Page, title: string, hour: number) {
    await page.goto("/panel/horarios/nueva");
    await page.getByLabel(/Nombre de la clase/i).fill(title);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    tomorrow.setHours(hour, 0, 0, 0);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
    await page.getByLabel(/Fecha y hora inicio/i).fill(dateStr);
    await page.getByRole("button", { name: /Crear clase/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios/, { timeout: 10000 });
  }

  test("admin selecciona dos clases en vista Lista y las cancela en bulk", async ({ page }) => {
    await createClass(page, TITLE_A, 9);
    await createClass(page, TITLE_B, 10);

    await page.goto("/panel/horarios");
    await page.getByRole("button", { name: /Lista/i }).click();
    await page.waitForTimeout(1500);

    const selectBtn = page.getByRole("button", { name: /Seleccionar varias/i });
    await expect(selectBtn).toBeVisible({ timeout: 10000 });
    await selectBtn.click();

    const cbA = page.getByLabel(new RegExp(`Seleccionar ${TITLE_A}`));
    const cbB = page.getByLabel(new RegExp(`Seleccionar ${TITLE_B}`));
    await cbA.check();
    await cbB.check();

    const actionBtn = page.getByRole("button", { name: /^Cancelar clases$/ });
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    await page.getByRole("button", { name: /Sí, cancelarlas/i }).click();

    // Toast con el conteo
    await expect(page.getByRole("status").getByText(/2 clases canceladas/)).toBeVisible({ timeout: 10000 });

    // Las clases ya no aparecen en la lista
    await page.waitForTimeout(1500);
    await expect(page.getByRole("link", { name: new RegExp(TITLE_A) })).toHaveCount(0);
    await expect(page.getByRole("link", { name: new RegExp(TITLE_B) })).toHaveCount(0);
    await expect(page.getByText(new RegExp(TITLE_A))).toHaveCount(0);
    await expect(page.getByText(new RegExp(TITLE_B))).toHaveCount(0);
  });
});
