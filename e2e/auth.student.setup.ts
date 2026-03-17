import { test as setup, expect } from "@playwright/test";

const authFile = ".auth/student.json";

setup("authenticate as student", async ({ page }) => {
  const email = process.env.E2E_STUDENT_EMAIL ?? "student@cuerporaiz.cl";
  const password = process.env.E2E_STUDENT_PASSWORD ?? "student123";
  const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

  await page.goto("/auth/login");
  await page.getByLabel(/centro/i).fill(centerSlug);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});

