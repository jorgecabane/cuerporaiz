import { test, expect } from "@playwright/test";

test.describe("Reservas", () => {
  test("panel reservas carga y muestra secciones", async ({ page }) => {
    await page.goto("/panel/reservas");
    await expect(page).toHaveURL(/\/panel\/reservas/);
    await expect(page.getByRole("heading", { name: /clases en vivo y reservas/i })).toBeVisible({ timeout: 15000 });
    // En staff/admin no hay TabsRoot; validamos el selector de días (WeekDaySelector) que usa role=tablist
    await expect(page.getByRole("tablist", { name: /días de la semana/i })).toBeVisible();
  });
});
