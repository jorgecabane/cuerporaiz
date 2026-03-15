import { test, expect } from "@playwright/test";

test.describe("Reservas", () => {
  test("panel reservas carga y muestra secciones", async ({ page }) => {
    await page.goto("/panel/reservas");
    await expect(page).toHaveURL(/\/panel\/reservas/);
    await expect(page.getByRole("heading", { name: /clases en vivo y reservas/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: /próximas clases/i })).toBeVisible();
  });
});
