import { test, expect } from "@playwright/test";
import { cleanupEvents } from "./helpers/cleanup";

test.describe("Panel admin - Eventos CRUD", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let eventName: string;

  test.beforeAll(() => {
    runId = Date.now().toString(36);
    eventName = `E2E Retiro ${runId}`;
  });

  // Safety net: clean up even if UI tests fail
  test.afterAll(async () => {
    await cleanupEvents(`E2E Retiro ${runId}`);
  });

  test("admin puede crear un evento", async ({ page }) => {
    await page.goto("/panel/eventos/nuevo");
    await expect(
      page.getByRole("heading", { name: /Nuevo evento/i })
    ).toBeVisible({ timeout: 15000 });

    await page.getByLabel(/Título/i).fill(eventName);
    await page.getByLabel(/Descripción/i).fill("Evento creado por E2E");
    await page.getByLabel(/Ubicación/i).fill("Santiago, Chile");

    // Set dates (tomorrow 10:00 to day after 18:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    dayAfter.setHours(18, 0, 0, 0);

    const startStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T10:00`;
    const endStr = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, "0")}-${String(dayAfter.getDate()).padStart(2, "0")}T18:00`;

    await page.getByLabel(/Fecha inicio/i).fill(startStr);
    await page.getByLabel(/Fecha fin/i).fill(endStr);
    await page.getByLabel(/Precio/i).fill("50000");
    await page.getByLabel(/Capacidad/i).fill("20");

    await page.getByRole("button", { name: /Crear evento/i }).click();
    await expect(page).toHaveURL(/\/panel\/eventos/, { timeout: 15000 });
  });

  test("admin ve el evento en la lista", async ({ page }) => {
    await page.goto("/panel/eventos");
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 15000 });
  });

  test("admin puede ver detalle del evento", async ({ page }) => {
    await page.goto("/panel/eventos");
    await page.getByText(eventName).click();
    await expect(page.getByRole("heading", { name: new RegExp(eventName, "i") })).toBeVisible({
      timeout: 15000,
    });
  });

  test("cleanup: elimina el evento E2E", async ({ page }) => {
    await page.goto("/panel/eventos");
    await page.getByText(eventName).click();
    await expect(page.getByRole("heading", { name: new RegExp(eventName, "i") })).toBeVisible({
      timeout: 15000,
    });

    // Open edit mode to find delete button
    const editBtn = page.getByRole("button", { name: /Editar/i });
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
    }

    await page.getByRole("button", { name: /Eliminar evento/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /Eliminar/i }).click();
    await expect(page).toHaveURL(/\/panel\/eventos/, { timeout: 15000 });
  });
});
