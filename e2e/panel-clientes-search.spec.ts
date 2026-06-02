import { test, expect } from "@playwright/test";
import {
  cleanupTier1UsersByEmailPrefix,
  seedBulkStudents,
} from "./helpers/cleanup";

const CENTER_SLUG = "e2e-test";
const EMAIL_PREFIX = "e2e-search-";
const NAME_LABEL = "E2E Search";
const STUDENT_COUNT = 30;

test.describe.configure({ mode: "serial" });

test.describe("Panel admin · Clientes · búsqueda y paginación", () => {
  test.beforeAll(async () => {
    const result = await seedBulkStudents({
      centerSlug: CENTER_SLUG,
      emailPrefix: EMAIL_PREFIX,
      nameLabel: NAME_LABEL,
      count: STUDENT_COUNT,
    });
    if (!result) throw new Error("Seed de estudiantes bulk falló (¿DATABASE_URL?)");
  });

  test.afterAll(async () => {
    await cleanupTier1UsersByEmailPrefix(EMAIL_PREFIX);
  });

  test("carga la lista, busca por nombre y limpia el filtro", async ({ page }) => {
    await page.goto("/panel/clientes");
    await expect(page.getByRole("heading", { name: /^Estudiantes$/i })).toBeVisible();

    const search = page.getByPlaceholder("Buscar por nombre o email…");
    await expect(search).toBeVisible();

    await expect(page.getByText(/\d+ estudiantes? · Mostrando/)).toBeVisible();

    await search.fill("Search 17");
    await expect(page).toHaveURL(/\?q=Search(\+|%20)17/);
    await expect(page.getByText("E2E Search 17")).toBeVisible();
    await expect(page.getByText("e2e-search-17@e2e.test")).toBeVisible();

    await search.fill("zzz-no-match-xyz");
    await expect(page.getByText(/Sin resultados para «zzz-no-match-xyz»/)).toBeVisible();

    await search.fill("");
    await expect(page).toHaveURL(/\/panel\/clientes(\?|$)/);
    await expect(page.getByText(/\d+ estudiantes? · Mostrando 1–25/)).toBeVisible();
  });

  test("navega entre páginas y persiste el estado en la URL", async ({ page }) => {
    await page.goto("/panel/clientes");
    await expect(page.getByText(/\d+ estudiantes? · Mostrando 1–25/)).toBeVisible();

    await page.getByRole("button", { name: /Ir a página 2/i }).click();
    await expect(page).toHaveURL(/\?page=2/);
    await expect(page.getByText(/Mostrando 26–/)).toBeVisible();

    await page.getByRole("button", { name: /Página anterior/i }).click();
    await expect(page).toHaveURL(/\/panel\/clientes(\?|$)/);
    await expect(page.getByText(/Mostrando 1–25/)).toBeVisible();
  });
});
