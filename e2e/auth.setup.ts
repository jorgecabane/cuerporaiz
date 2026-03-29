import { test as setup, expect } from "@playwright/test";

const authFile = ".auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.E2E_USER_PASSWORD ?? "admin123";

  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
