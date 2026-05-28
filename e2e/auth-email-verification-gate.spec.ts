import { test, expect } from "@playwright/test";
import {
  cleanupTier1UsersByEmailPrefix,
  getTier1LatestEmailVerificationToken,
} from "./helpers/cleanup";

/**
 * Gate de verificación de email en el login. PR #3 de la auditoría (C6):
 * antes, cualquiera podía firmar con email ajeno y entrar sin verificar.
 * Ahora authorize() rechaza con EMAIL_NOT_VERIFIED hasta que clickeen el link.
 *
 * Usuarios pre-existentes quedan grandfathered (admin@e2e.test y compañía ya
 * tienen emailVerifiedAt seteado por seed).
 */
test.describe("Auth — email verification gate", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const emailPrefix = "e2e-verifygate-";
  const password = "Test1234!";

  test.afterAll(async () => {
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
  });

  test("signup nuevo → intento de login sin verificar → bloqueado con mensaje claro", async ({
    page,
  }) => {
    const email = `${emailPrefix}block-${Date.now()}@example.test`;

    await page.goto("/auth/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });

    // Intentar login sin verificar.
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /^entrar$/i }).click();

    await expect(page.getByText(/verifica tu email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /reenviar/i })).toBeVisible();
    // Sigue en /auth/login (no entró al panel).
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("signup → verify token → login pasa", async ({ page }) => {
    const email = `${emailPrefix}happy-${Date.now()}@example.test`;

    await page.goto("/auth/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });

    const tokenRecord = await getTier1LatestEmailVerificationToken(email);
    test.skip(!tokenRecord, "Sin DB en este worker");
    if (!tokenRecord) return;

    await page.goto(`/auth/verify-email?token=${tokenRecord.token}`, {
      waitUntil: "domcontentloaded",
    });
    // Ahora puede loguear.
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 10000 });
  });

  test("usuario grandfathered (seed) entra sin tener que reverificar", async ({ page }) => {
    const seededEmail = process.env.E2E_USER_EMAIL ?? "admin@e2e.test";
    const seededPassword = process.env.E2E_USER_PASSWORD ?? "admin123";

    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(seededEmail);
    await page.getByLabel(/contraseña/i).fill(seededPassword);
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 10000 });
  });

  test("CTA 'reenviar verificación' desde pantalla bloqueada funciona end-to-end", async ({
    page,
  }) => {
    const email = `${emailPrefix}resend-${Date.now()}@example.test`;

    await page.goto("/auth/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });

    // Capturar el primer token (signup ya lo creó).
    const firstToken = await getTier1LatestEmailVerificationToken(email);
    test.skip(!firstToken, "Sin DB en este worker");
    if (!firstToken) return;

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page.getByText(/verifica tu email/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /reenviar/i }).click();
    // Distinto al banner "Te mandamos un email" del registered=1 — ese ya está visible.
    await expect(page.getByText(/te mandamos un nuevo link/i)).toBeVisible({
      timeout: 30000,
    });

    // Debe haberse creado un token nuevo (más reciente que el de signup).
    const secondToken = await getTier1LatestEmailVerificationToken(email);
    expect(secondToken).not.toBeNull();
    if (secondToken && firstToken) {
      expect(secondToken.token).not.toBe(firstToken.token);
    }
  });
});
