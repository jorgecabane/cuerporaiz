import { test, expect } from "@playwright/test";
import {
  getLatestPasswordResetToken,
  cleanupTier2PasswordResetData,
  seedTier2PasswordResetToken,
  seedTier2ResetUser,
  cleanupTier2User,
  clearTier2LoginAttempts,
} from "./helpers/cleanup";

/**
 * E2E del flujo de password reset:
 *  1. Solicitar reset desde /auth/forgot-password.
 *  2. Capturar el token recién creado en DB.
 *  3. Setear nueva contraseña en /auth/reset-password?token=...
 *  4. Verificar:
 *     - Login con la nueva contraseña funciona.
 *     - Login con la vieja falla.
 *     - El token quedó marcado como `usedAt != null`.
 *  5. Token expirado y token usado muestran avisos correctos.
 *
 * Usamos un user dedicado (no el admin) para no interferir con el
 * storageState compartido por el resto de tests.
 */
const RESET_USER_PREFIX = "tier2-reset-user";
const ORIGINAL_PASSWORD = "InitialPwd-2026!";

// Tests deslogueados.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Auth — password reset flow", () => {
  test.describe.configure({ mode: "serial" });

  let testUser: Awaited<ReturnType<typeof seedTier2ResetUser>>;

  test.beforeAll(async () => {
    testUser = await seedTier2ResetUser({
      centerSlug: "e2e-test",
      emailPrefix: RESET_USER_PREFIX,
      initialPassword: ORIGINAL_PASSWORD,
    });
    if (testUser) {
      await cleanupTier2PasswordResetData(testUser.email);
    }
    // Reset rate-limit del centro para que los logins de este spec (y los
    // de auth.spec.ts/panel-mi-cuenta) no choquen con 5 intentos/15min
    // compartidos. El seed ya hace esto al inicio del e2e; lo repetimos
    // antes de este spec porque va a sumar más intentos.
    await clearTier2LoginAttempts("e2e-test");
  });

  test.afterAll(async () => {
    if (testUser) {
      await cleanupTier2User(testUser.email);
    }
  });

  test("forgot-password → token en DB → reset → login con password nuevo", async ({ page }) => {
    test.skip(!testUser, "Sin DB en este worker");
    const NEW_PASSWORD = "ResetE2E-2026!";

    // 1. Solicitar reset.
    await page.goto("/auth/forgot-password");
    await expect(page.getByRole("heading", { name: /recuperar contraseña/i })).toBeVisible();
    await page.getByLabel(/centro/i).fill("e2e-test");
    await page.getByLabel(/email/i).fill(testUser!.email);
    await page.getByRole("button", { name: /enviar enlace/i }).click();
    await expect(page.getByText(/si el email existe/i)).toBeVisible({ timeout: 10000 });

    // 2. Capturar token recién creado.
    const tokenRow = await getLatestPasswordResetToken(testUser!.email);
    expect(tokenRow).toBeTruthy();
    expect(tokenRow!.usedAt).toBeNull();

    // 3. Form de reset.
    await page.goto(`/auth/reset-password?token=${tokenRow!.token}`);
    await expect(page.getByRole("heading", { name: /nueva contraseña/i })).toBeVisible();
    await page.getByLabel("Nueva contraseña").fill(NEW_PASSWORD);
    await page.getByLabel("Confirmar contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /guardar contraseña/i }).click();

    await expect(page).toHaveURL(/\/auth\/login\?reset=1/, { timeout: 10000 });

    // 4. Login con nuevo password funciona.
    await page.getByLabel(/email/i).fill(testUser!.email);
    await page.getByLabel(/contraseña/i).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    // Como el user es STUDENT podría redirigir a /panel — la URL incluye /panel
    // (puede ir a panel home o panel/algo).
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // 5. Token quedó marcado como usado.
    const tokenAfter = await getLatestPasswordResetToken(testUser!.email);
    expect(tokenAfter?.usedAt).not.toBeNull();
  });

  test("login con la contraseña vieja falla tras el reset", async ({ page }) => {
    test.skip(!testUser, "Sin DB en este worker");
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(testUser!.email);
    await page.getByLabel(/contraseña/i).fill(ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test("token expirado muestra mensaje de enlace expirado", async ({ page }) => {
    test.skip(!testUser, "Sin DB en este worker");
    const expiredToken = `expired-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const seeded = await seedTier2PasswordResetToken({
      userEmail: testUser!.email,
      token: expiredToken,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    expect(seeded).toBeTruthy();

    await page.goto(`/auth/reset-password?token=${expiredToken}`);
    await expect(page.getByRole("heading", { name: /nueva contraseña/i })).toBeVisible();
    await page.getByLabel("Nueva contraseña").fill("OtroPass2026!");
    await page.getByLabel("Confirmar contraseña").fill("OtroPass2026!");
    await page.getByRole("button", { name: /guardar contraseña/i }).click();

    await expect(
      page.getByRole("heading", { name: /enlace expirado/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("token usado muestra mensaje de enlace inválido", async ({ page }) => {
    test.skip(!testUser, "Sin DB en este worker");
    const usedToken = `used-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const seeded = await seedTier2PasswordResetToken({
      userEmail: testUser!.email,
      token: usedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      markUsed: true,
    });
    expect(seeded).toBeTruthy();

    await page.goto(`/auth/reset-password?token=${usedToken}`);
    await page.getByLabel("Nueva contraseña").fill("OtroPass2026!");
    await page.getByLabel("Confirmar contraseña").fill("OtroPass2026!");
    await page.getByRole("button", { name: /guardar contraseña/i }).click();

    await expect(
      page.getByRole("heading", { name: /enlace inválido/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
