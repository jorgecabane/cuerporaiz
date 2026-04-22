/**
 * On-demand student flow E2E tests.
 *
 * These tests run under the `chromium-student` Playwright project, which requires
 * E2E_ENABLE_STUDENT=1 and a seeded student user with an active on-demand plan.
 * All tests use graceful early returns when seed data is absent to avoid false
 * failures in environments without the full student dataset.
 */
import { test, expect } from "@playwright/test";

test.describe("Replay (student flow)", () => {
  // ─── Test 1: Student sees quota chips ─────────────────────────────────────
  test("student ve chips de cuota en Replay", async ({ page }) => {
    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

    const replayHeading = page.getByRole("heading", { name: /Biblioteca virtual/i });
    const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasPlan) return; // No active plan in seed — skip gracefully.

    // Quota chips render as "X/Y" fractions (e.g., "3/4")
    const quotaChip = page.locator("text=/\\d+\\/\\d+/").first();
    await expect(quotaChip).toBeVisible({ timeout: 10000 });
  });

  // ─── Test 2: Student navigates grid → practice → player ───────────────────
  test("student navega grid → práctica → player", async ({ page }) => {
    await page.goto("/panel/replay");
    await expect(page).toHaveURL(/\/panel\/replay/, { timeout: 15000 });

    const replayHeading = page.getByRole("heading", { name: /Biblioteca virtual/i });
    const hasPlan = await replayHeading.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasPlan) return;

    // Click the first practice card button
    const practiceButton = page
      .getByRole("button")
      .filter({ hasNot: page.getByRole("heading") })
      .first();
    const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPractice) return;

    await practiceButton.click();
    await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

    // Find a "Ver clase" button for an already-unlocked lesson in seed data
    const verClaseBtn = page.getByRole("button", { name: /Ver clase/i }).first();
    const hasUnlocked = await verClaseBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasUnlocked) return;

    await verClaseBtn.click();

    // Player view: URL should gain ?lesson= parameter
    await expect(page).toHaveURL(/\/panel\/replay\?.*lesson=/, { timeout: 10000 });

    // Back button (←) should be visible in the player view
    await expect(page.getByRole("button", { name: /←/ })).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 3: Student canjea una clase (mocked API) ─────────────────────────
  test("student canjea una clase y el botón cambia a Ver clase", async ({ page }) => {
    // Mock the unlock endpoint to avoid consuming real quota from seed data
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

    // Navigate into a practice
    const practiceButton = page
      .getByRole("button")
      .filter({ hasNot: page.getByRole("heading") })
      .first();
    const hasPractice = await practiceButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPractice) return;

    await practiceButton.click();
    await expect(page).toHaveURL(/\/panel\/replay\?practice=/, { timeout: 10000 });

    // Click "Canjear" on a locked lesson
    const canjearBtn = page.getByRole("button", { name: /^Canjear$/i }).first();
    const hasCanjear = await canjearBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCanjear) return; // All lessons already unlocked in seed.

    await canjearBtn.click();

    // Confirmation modal should appear with heading "Canjear clase"
    await expect(
      page.getByRole("heading", { name: /Canjear clase/i })
    ).toBeVisible({ timeout: 5000 });

    // The modal uses a fixed overlay (not role="dialog") — target the confirm button inside it
    const modalConfirm = page
      .locator(".fixed.inset-0")
      .getByRole("button", { name: /^Canjear$/i });
    await expect(modalConfirm).toBeVisible({ timeout: 5000 });
    await modalConfirm.click();

    // Modal should close after the (mocked) unlock succeeds
    await expect(
      page.getByRole("heading", { name: /Canjear clase/i })
    ).not.toBeVisible({ timeout: 10000 });
  });
});

// ─── Public catalog navigation ──────────────────────────────────────────────
// These tests do not require authentication and run in any project.
test.describe("Catálogo público — navegación completa", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("catálogo público navega categoría → práctica → lista de lecciones", async ({ page }) => {
    await page.goto("/catalogo");
    await expect(
      page.getByRole("heading", { name: /Biblioteca virtual/i })
    ).toBeVisible({ timeout: 15000 });

    // Click the first category card link (wraps an h2)
    const categoryLink = page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { level: 2 }) })
      .first();
    const hasCategory = await categoryLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCategory) {
      // Empty catalog — verify the empty state message instead
      await expect(
        page.getByText(/Aún no hay contenido disponible/i)
      ).toBeVisible({ timeout: 5000 });
      return;
    }

    await categoryLink.click();
    await expect(page).toHaveURL(/\/catalogo\/[^/]+$/, { timeout: 10000 });

    // Category detail: heading matches the category name (h1)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });

    // Click first practice card
    const practiceLink = page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { level: 2 }) })
      .first();
    const hasPractice = await practiceLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPractice) {
      await expect(
        page.getByText(/Aún no hay prácticas disponibles/i)
      ).toBeVisible({ timeout: 5000 });
      return;
    }

    await practiceLink.click();
    await expect(page).toHaveURL(/\/catalogo\/[^/]+\/[^/]+$/, { timeout: 10000 });

    // Practice detail: heading (h1) should be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });

    // Lesson list or empty state must be present — video URLs are never exposed here
    const lessonItem = page.locator("ul li").first();
    const emptyLessons = page.getByText(/Aún no hay clases disponibles/i);
    await expect(lessonItem.or(emptyLessons)).toBeVisible({ timeout: 5000 });
  });
});
