import { test, expect } from "@playwright/test";

test.describe("Páginas públicas", () => {
  test("membresía carga correctamente", async ({ page }) => {
    await page.goto("/membresia");
    await expect(
      page.getByRole("heading", { name: /membresía/i })
    ).toBeVisible();
    await expect(page.getByText(/próximamente/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /volver al inicio/i })
    ).toBeVisible();
  });

  test("packs carga correctamente", async ({ page }) => {
    await page.goto("/packs");
    await expect(
      page.getByRole("heading", { name: /packs de clases/i })
    ).toBeVisible();
    await expect(page.getByText(/próximamente/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /volver al inicio/i })
    ).toBeVisible();
  });
});
