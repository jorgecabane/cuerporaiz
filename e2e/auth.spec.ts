import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page loads with correct fields", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Entrar");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("signup page loads with correct fields", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Crear cuenta");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /crear cuenta/i })).toBeVisible();
    await expect(page.getByText(/ya tienes cuenta/i)).toBeVisible();
  });

  test("signup has link to login", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByText(/ya tienes cuenta/i).getByRole("link").click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
