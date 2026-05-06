import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_USER_EMAIL ?? "admin@e2e.test";
const ADMIN_PASSWORD = process.env.E2E_USER_PASSWORD ?? "admin123";

test.describe("Auth — páginas y formularios", () => {
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

test.describe("Auth — login real con credenciales", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login con credenciales válidas redirige al panel", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });
  });

  test("login con contraseña incorrecta muestra error y queda en /auth/login", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill("contrasena-mala-1234");
    await page.getByRole("button", { name: /entrar/i }).click();
    // No redirige al panel.
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
    // Mensaje de error visible (texto puede variar; aceptamos cualquier mensaje
    // de tipo "credenciales" o "no son correctos" sin asumir copy exacto).
    const error = page.getByRole("alert").or(page.getByText(/credenciales|incorrect|no son correctos|inválid/i));
    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test("login con callbackUrl preserva destino post-login", async ({ page }) => {
    await page.goto("/auth/login?callbackUrl=/panel/clientes");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/panel\/clientes/, { timeout: 15000 });
  });
});

test.describe("Auth — logout", () => {
  // Sesión aislada: login fresco para no invalidar `.auth/admin.json`.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("logout desde el panel termina sesión y redirige fuera", async ({ page }) => {
    // Login fresh.
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Abrir menú de cuenta y hacer click en cerrar sesión.
    await page.getByRole("button", { name: /men[uú] de cuenta/i }).click();
    await page.getByRole("button", { name: /cerrar sesi[oó]n/i }).first().click();

    // Tras logout queda fuera del panel.
    await expect(page).not.toHaveURL(/\/panel/, { timeout: 15000 });
  });
});
