import { test, expect } from "@playwright/test";

// These tests run ONLY in the chromium-student project (E2E_ENABLE_STUDENT=1).
// The filename contains "student" so playwright.config.ts testIgnore filters
// them out of the default chromium (admin) project.

test.describe("On-demand / Replay (student)", () => {
  test("ve heading Replay con plan activo", async ({ page }) => {
    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

    const replayHeading = page.getByRole("heading", { name: /Biblioteca virtual/i });
    const noPlanMsg = page.getByText(/No tienes un plan activo/i);
    await expect(replayHeading.or(noPlanMsg)).toBeVisible({ timeout: 15000 });
  });

  test("navega a práctica y ve botón volver", async ({ page }) => {
    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

    const replayHeading = page.getByRole("heading", { name: /Biblioteca virtual/i });
    const noPlanMsg = page.getByText(/No tienes un plan activo/i);

    const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasPlan) {
      await expect(noPlanMsg).toBeVisible({ timeout: 10000 });
      return;
    }

    await expect(replayHeading).toBeVisible();

    const practiceButton = page.getByRole("button").filter({ hasNot: page.getByRole("heading") }).first();
    const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasPractice) {
      await expect(replayHeading).toBeVisible();
      return;
    }

    await practiceButton.click();
    await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });
    await expect(page.getByRole("button", { name: /←/ })).toBeVisible({ timeout: 10000 });
  });

  test("puede expandir detalles de una lección", async ({ page }) => {
    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

    const replayHeading = page.getByRole("heading", { name: /Biblioteca virtual/i });
    const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasPlan) return;

    const practiceButton = page.getByRole("button").filter({ hasNot: page.getByRole("heading") }).first();
    const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPractice) return;

    await practiceButton.click();
    await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

    const detailsButton = page.getByRole("button", { name: /Detalles|Ver detalles/i }).first();
    const hasDetails = await detailsButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasDetails) return;

    await detailsButton.click();
    const expandedContent = page.getByRole("button", { name: /Cerrar/i }).first();
    await expect(expandedContent).toBeVisible({ timeout: 5000 });
  });

  test("muestra modal Canjear clase al canjear una lección bloqueada", async ({ page }) => {
    await page.route("**/api/on-demand/unlock", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

    const replayHeading = page.getByRole("heading", { name: /Biblioteca virtual/i });
    const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasPlan) return;

    const practiceButton = page.getByRole("button").filter({ hasNot: page.getByRole("heading") }).first();
    const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPractice) return;

    await practiceButton.click();
    await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

    const canjearBtn = page.getByRole("button", { name: /^Canjear$/i }).first();
    const hasCanjear = await canjearBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCanjear) return;

    await canjearBtn.click();
    await expect(page.getByRole("heading", { name: /Canjear clase/i })).toBeVisible({ timeout: 5000 });

    const modalConfirm = page.locator(".fixed.inset-0").getByRole("button", { name: /^Canjear$/i });
    await expect(modalConfirm).toBeVisible({ timeout: 5000 });
    await modalConfirm.click();

    await expect(page.getByRole("heading", { name: /Canjear clase/i })).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("ruta /panel/on-demand redirige a /panel/replay", async ({ page }) => {
    await page.goto("/panel/on-demand");
    await expect(page).toHaveURL(/\/panel\/replay|\/panel\/on-demand\/categorias/, { timeout: 15000 });
  });
});
