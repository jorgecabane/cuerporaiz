import { test, expect } from "@playwright/test";

test.describe("On-demand admin CRUD", () => {
  test.describe.configure({ mode: "serial" });

  // Unique run suffix to avoid collisions across parallel CI runs
  let runId: string;
  let categoryName: string;
  let practiceName: string;
  let lessonTitle: string;

  test.beforeAll(() => {
    runId = Date.now().toString(36);
    categoryName = `E2E Yoga ${runId}`;
    practiceName = `E2E Hatha ${runId}`;
    lessonTitle = `E2E Clase ${runId}`;
  });

  // ─── Test 1: Admin creates a category ───────────────────────────────────────
  test("admin puede crear una categoría on demand", async ({ page }) => {
    await page.goto("/panel/on-demand/categorias");
    await expect(
      page.getByRole("heading", { name: /Categorías On Demand/i })
    ).toBeVisible({ timeout: 15000 });

    // Toggle the inline creation form
    await page.getByRole("button", { name: /Nueva categoría/i }).click();

    // Fill fields — labels are tied to htmlFor ids, use label text
    await page.getByLabel(/^Nombre/i).fill(categoryName);
    await page.getByLabel(/Descripción \(opcional\)/i).fill("Categoría creada por E2E");
    await page.getByLabel(/^Estado/i).selectOption("PUBLISHED"); // value = "PUBLISHED"

    // Submit the inline form
    await page.getByRole("button", { name: /Crear categoría/i }).click();

    // After server action + router.refresh(), the new category should appear as a link
    await expect(page.getByRole("link", { name: new RegExp(categoryName) })).toBeVisible({
      timeout: 15000,
    });
  });

  // ─── Test 2: Admin creates a practice inside the category ───────────────────
  test("admin puede crear una práctica dentro de la categoría", async ({ page }) => {
    await page.goto("/panel/on-demand/categorias");
    await expect(
      page.getByRole("link", { name: new RegExp(categoryName) })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to the category detail page via the link
    await page.getByRole("link", { name: new RegExp(categoryName) }).click();

    // Heading should match the category name
    await expect(
      page.getByRole("heading", { name: new RegExp(categoryName, "i") })
    ).toBeVisible({ timeout: 10000 });

    // Toggle the practice form
    await page.getByRole("button", { name: /Nueva práctica/i }).click();

    await page.locator("#prac-name").fill(practiceName);
    await page.locator("#prac-status").selectOption("PUBLISHED");

    await page.getByRole("button", { name: /Crear práctica/i }).click();

    // Practice should appear as a link in the list
    await expect(
      page.getByRole("link", { name: new RegExp(practiceName) })
    ).toBeVisible({ timeout: 15000 });
  });

  // ─── Test 3: Admin creates a lesson ─────────────────────────────────────────
  test("admin puede crear una lección", async ({ page }) => {
    await page.goto("/panel/on-demand/lecciones/nueva");
    await expect(
      page.getByRole("heading", { name: /Nueva lección/i })
    ).toBeVisible({ timeout: 15000 });

    // Select category (labeled "Categoría")
    await page.getByLabel(/^Categoría/i).selectOption({ label: categoryName });

    // Wait for the practice select to be enabled and populated
    const practiceSelect = page.getByLabel(/^Práctica/i);
    await expect(practiceSelect).toBeEnabled({ timeout: 5000 });
    await practiceSelect.selectOption({ label: practiceName });

    // Fill required text fields
    await page.getByLabel(/^Título/i).fill(lessonTitle);
    await page.getByLabel(/URL del video/i).fill("https://player.vimeo.com/video/123456789");

    // Submit
    await page.getByRole("button", { name: /Crear lección/i }).click();

    // After creation, the practice page should show the lesson (redirect goes to practice detail)
    await expect(
      page.getByText(lessonTitle).or(page.getByRole("heading", { name: new RegExp(lessonTitle, "i") }))
    ).toBeVisible({ timeout: 15000 });
  });

  // ─── Test 4: Cleanup — delete the category (dialog confirm) ─────────────────
  test("cleanup: elimina la categoría E2E creada", async ({ page }) => {
    await page.goto("/panel/on-demand/categorias");
    await expect(
      page.getByRole("link", { name: new RegExp(categoryName) })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to the category detail page
    await page.getByRole("link", { name: new RegExp(categoryName) }).click();
    await expect(
      page.getByRole("heading", { name: new RegExp(categoryName, "i") })
    ).toBeVisible({ timeout: 10000 });

    // Click delete button to open ConfirmDialog, then confirm
    await page.getByRole("button", { name: /Eliminar categoría/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /Eliminar/i }).click();

    // After deletion, should redirect back to the categories list
    await expect(page).toHaveURL(/\/panel\/on-demand\/categorias$/, { timeout: 15000 });

    // Category should no longer be visible
    await expect(page.getByRole("link", { name: new RegExp(categoryName) })).not.toBeVisible({
      timeout: 5000,
    });
  });
});
