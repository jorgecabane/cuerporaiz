import { test, expect } from "@playwright/test";

test.describe("On-demand / Replay", () => {
  // ─── Public catalog (no auth) ─────────────────────────────────────────────
  test.describe("Catálogo público", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("muestra heading Catálogo on demand", async ({ page }) => {
      await page.goto("/catalogo");
      await expect(page.getByRole("heading", { name: /Catálogo on demand/i })).toBeVisible({
        timeout: 15000,
      });
    });

    test("muestra al menos una categoría", async ({ page }) => {
      await page.route("**/catalogo**", async (route) => route.fallback());

      await page.goto("/catalogo");
      await expect(page.getByRole("heading", { name: /Catálogo on demand/i })).toBeVisible({
        timeout: 15000,
      });

      const categoryHeading = page.getByRole("heading", { level: 2 }).first();
      const emptyState = page.getByText(/Aún no hay contenido disponible/i);
      await expect(categoryHeading.or(emptyState)).toBeVisible({ timeout: 10000 });
    });
  });
});

// ─── Admin redirects ────────────────────────────────────────────────────────
test.describe("On-demand admin redirects", () => {
  test("admin en /panel/on-demand redirige a categorías", async ({ page }) => {
    await page.goto("/panel/on-demand");
    await expect(page).toHaveURL(/\/panel\/on-demand\/categorias/, { timeout: 15000 });
  });

  test("admin en /panel/replay redirige a categorías", async ({ page }) => {
    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/on-demand\/categorias/, { timeout: 15000 });
  });
});
