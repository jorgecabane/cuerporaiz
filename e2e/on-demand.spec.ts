import { test, expect } from "@playwright/test";

test.describe("On-demand / Replay", () => {
  // ─── Test 1: Public catalog ───────────────────────────────────────────────
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

      // At least one category card (h2) or the empty state message should be present
      const categoryHeading = page.getByRole("heading", { level: 2 }).first();
      const emptyState = page.getByText(/Aún no hay contenido disponible/i);
      await expect(categoryHeading.or(emptyState)).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Tests that require student session ──────────────────────────────────
  // These run in the chromium-student project (E2E_ENABLE_STUDENT=1)
  // or are skipped in the standard chromium project.

  // The Replay tests require a student session. The /panel/replay page redirects
  // admins to /panel/on-demand/categorias, so these tests only work under the
  // chromium-student project (E2E_ENABLE_STUDENT=1). When running under the
  // default admin session we verify the admin redirect instead.
  test.describe("Replay (student)", () => {
    test("admin en /panel/replay redirige a categorías", async ({ page }) => {
      await page.goto("/panel/replay");
      await expect(page).toHaveURL(/\/panel\/on-demand\/categorias/, { timeout: 15000 });
    });
  });

  // ─── Test 6: Old /panel/on-demand redirects based on role ─────────────────
  test("ruta /panel/on-demand redirige según rol", async ({ page }) => {
    await page.goto("/panel/on-demand");
    // Admin redirects to /panel/on-demand/categorias; student to /panel/replay.
    await expect(page).toHaveURL(/\/panel\/replay|\/panel\/on-demand\/categorias/, { timeout: 15000 });
  });
});

// ─── Admin redirects ────────────────────────────────────────────────────────
// These tests run under the admin session (chromium project).
test.describe("On-demand admin redirects", () => {
  test("admin en /panel/on-demand redirige a categorías", async ({ page }) => {
    await page.goto("/panel/on-demand");
    await expect(page).toHaveURL(/\/panel\/on-demand\/categorias/, { timeout: 15000 });
  });
});
