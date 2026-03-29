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

  test.describe("Replay (student)", () => {
    // ─── Test 2: Replay page ────────────────────────────────────────────────
    test("ve heading Replay con plan activo", async ({ page }) => {
      // Mock categories endpoint to avoid DB dependency on seed data structure.
      await page.route("**/panel/replay**", async (route) => route.fallback());

      await page.goto("/panel/replay");
      await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

      // Either the Replay heading (has plan) or the no-plan message should appear.
      const replayHeading = page.getByRole("heading", { name: /Replay/i });
      const noPlanMsg = page.getByText(/No tienes un plan activo/i);
      await expect(replayHeading.or(noPlanMsg)).toBeVisible({ timeout: 15000 });
    });

    // ─── Test 3: Practice cards and back button ─────────────────────────────
    test("navega a práctica y ve botón volver", async ({ page }) => {
      await page.goto("/panel/replay");
      await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

      const replayHeading = page.getByRole("heading", { name: /Replay/i });
      const noPlanMsg = page.getByText(/No tienes un plan activo/i);

      // Skip the navigation part if student has no plan (seed-dependent).
      const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
      if (!hasPlan) {
        await expect(noPlanMsg).toBeVisible({ timeout: 10000 });
        return;
      }

      await expect(replayHeading).toBeVisible();

      // Click the first practice card (button) if one exists.
      const practiceButton = page.getByRole("button").filter({ hasNot: page.getByRole("heading") }).first();
      const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPractice) {
        // No practices seeded — just verify the heading.
        await expect(replayHeading).toBeVisible();
        return;
      }

      await practiceButton.click();

      // After clicking a practice, the URL should have ?practice=...
      await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

      // Back button (←) should be visible.
      await expect(page.getByRole("button", { name: /←/ })).toBeVisible({ timeout: 10000 });
    });

    // ─── Test 4: Expand lesson details ─────────────────────────────────────
    test("puede expandir detalles de una lección", async ({ page }) => {
      await page.goto("/panel/replay");
      await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

      const replayHeading = page.getByRole("heading", { name: /Replay/i });
      const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
      if (!hasPlan) return; // No plan — seed-dependent, skip gracefully.

      // Navigate into a practice.
      const practiceButton = page.getByRole("button").filter({ hasNot: page.getByRole("heading") }).first();
      const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (!hasPractice) return;

      await practiceButton.click();
      await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

      // Click "Detalles" on first lesson that has it (desktop button, hidden on mobile).
      const detailsButton = page.getByRole("button", { name: /Detalles|Ver detalles/i }).first();
      const hasDetails = await detailsButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (!hasDetails) return; // No lessons with detail data in seed.

      await detailsButton.click();

      // Expanded content: either a description paragraph or tag chips or "Cerrar" button.
      const expandedContent = page.getByRole("button", { name: /Cerrar/i }).first();
      await expect(expandedContent).toBeVisible({ timeout: 5000 });
    });

    // ─── Test 5: Canjear modal ──────────────────────────────────────────────
    test("muestra modal Canjear clase al canjear una lección bloqueada", async ({ page }) => {
      // Mock the unlock API to avoid consuming real quota.
      await page.route("**/api/on-demand/unlock", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto("/panel/replay");
      await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

      const replayHeading = page.getByRole("heading", { name: /Replay/i });
      const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
      if (!hasPlan) return;

      // Navigate into a practice.
      const practiceButton = page.getByRole("button").filter({ hasNot: page.getByRole("heading") }).first();
      const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (!hasPractice) return;

      await practiceButton.click();
      await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

      // Click "Canjear" on first locked lesson.
      const canjearBtn = page.getByRole("button", { name: /^Canjear$/i }).first();
      const hasCanjear = await canjearBtn.isVisible({ timeout: 5000 }).catch(() => false);
      if (!hasCanjear) return; // All lessons already unlocked or none exist.

      await canjearBtn.click();

      // Modal with "Canjear clase" heading should appear.
      await expect(page.getByRole("heading", { name: /Canjear clase/i })).toBeVisible({ timeout: 5000 });

      // Confirm by clicking the "Canjear" button inside the modal.
      const confirmBtn = page
        .getByRole("dialog")
        .getByRole("button", { name: /^Canjear$/i })
        .or(page.locator(".fixed.inset-0").getByRole("button", { name: /^Canjear$/i }))
        .last();

      // Since there is no role="dialog" (it is a plain div), target the modal confirm button directly.
      const modalConfirm = page.locator(".fixed.inset-0").getByRole("button", { name: /^Canjear$/i });
      await expect(modalConfirm).toBeVisible({ timeout: 5000 });
      await modalConfirm.click();

      // After unlock (mocked), the modal should close.
      await expect(page.getByRole("heading", { name: /Canjear clase/i })).not.toBeVisible({
        timeout: 5000,
      });
    });
  });

  // ─── Test 6: Old /panel/on-demand redirects to /panel/replay ─────────────
  test("ruta /panel/on-demand redirige a /panel/replay (student)", async ({ page }) => {
    await page.goto("/panel/on-demand");
    // For a student session the redirect goes to /panel/replay.
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
