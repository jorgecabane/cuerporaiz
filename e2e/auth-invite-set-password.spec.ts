import { test, expect } from "@playwright/test";
import {
  getLatestPasswordResetToken,
  cleanupTier2User,
  cleanupTier2PasswordResetData,
  clearTier2LoginAttempts,
} from "./helpers/cleanup";

/**
 * E2E del flujo de invitación con set-password (token de 7 días):
 *  - Admin invita un profesor desde /panel/profesores/nueva.
 *  - Admin invita un estudiante desde /panel/clientes/nueva.
 *  - En ambos casos verificamos que se crea un PasswordResetToken,
 *    que la página /auth/reset-password?invite=1 muestra el copy de
 *    "Crea tu contraseña", y que el flujo termina con login exitoso.
 *
 * Usa el storageState de admin (default) para los formularios y limpia
 * cookies antes del set-password para simular al usuario invitado.
 */

const STAFF_EMAIL = "e2e-invite-staff@e2e.test";
const STAFF_NAME = "Profe Invite";
const STUDENT_EMAIL = "e2e-invite-student@e2e.test";
const STUDENT_NAME = "Estudiante Invite";
const NEW_PASSWORD = "InviteE2E-2026!";

test.describe("Auth — invite + set-password flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await cleanupTier2User(STAFF_EMAIL);
    await cleanupTier2User(STUDENT_EMAIL);
    await clearTier2LoginAttempts("e2e-test");
  });

  test.afterAll(async () => {
    await cleanupTier2User(STAFF_EMAIL);
    await cleanupTier2User(STUDENT_EMAIL);
  });

  test("admin invita profesor → token 7d → set-password → login", async ({ page, context }) => {
    test.skip(!process.env.DATABASE_URL, "Sin DB en este worker");

    // 1. Admin agrega profesor.
    await page.goto("/panel/profesores/nueva");
    await expect(page.getByRole("heading", { name: /agregar profesor/i })).toBeVisible({ timeout: 10000 });
    await page.getByLabel(/nombre/i).fill(STAFF_NAME);
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.getByRole("button", { name: /agregar profesor/i }).click();

    // 2. Esperamos a que la acción del server complete (redirige a /panel/profesores).
    await expect(page).toHaveURL(/\/panel\/profesores$/, { timeout: 15000 });

    // 3. Token creado en DB con vigencia ~7 días.
    const tokenRow = await getLatestPasswordResetToken(STAFF_EMAIL);
    expect(tokenRow).toBeTruthy();
    expect(tokenRow!.usedAt).toBeNull();
    const hoursToExpire = (tokenRow!.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursToExpire).toBeGreaterThan(24 * 6); // > 6 días
    expect(hoursToExpire).toBeLessThanOrEqual(24 * 7 + 1); // <= 7 días

    // 4. Cambiamos a contexto deslogueado para simular al profe invitado.
    await context.clearCookies();

    await page.goto(`/auth/reset-password?token=${tokenRow!.token}&invite=1`);
    await expect(page.getByRole("heading", { name: /crea tu contraseña/i })).toBeVisible();
    await page.getByLabel("Nueva contraseña").fill(NEW_PASSWORD);
    await page.getByLabel("Confirmar contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /crear contraseña/i }).click();

    // 5. Tras crear, redirige a /auth/login?welcome=1.
    await expect(page).toHaveURL(/\/auth\/login\?welcome=1/, { timeout: 10000 });

    // 6. Token quedó usado.
    const tokenAfter = await getLatestPasswordResetToken(STAFF_EMAIL);
    expect(tokenAfter?.usedAt).not.toBeNull();

    // 7. Login con la contraseña recién creada funciona.
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.getByLabel(/contraseña/i).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Limpieza: borramos los rate-limit attempts para no afectar otros tests.
    await clearTier2LoginAttempts("e2e-test");
    await cleanupTier2PasswordResetData(STAFF_EMAIL);
  });

  test("admin invita estudiante → token 7d → set-password → login", async ({ page, context }) => {
    test.skip(!process.env.DATABASE_URL, "Sin DB en este worker");

    // 1. Admin agrega estudiante.
    await page.goto("/panel/clientes/nueva");
    await expect(page.getByRole("heading", { name: /agregar estudiante/i })).toBeVisible({ timeout: 10000 });
    await page.getByLabel("Email").fill(STUDENT_EMAIL);
    await page.getByLabel(/nombre/i).fill(STUDENT_NAME);
    await page.getByRole("button", { name: /agregar estudiante/i }).click();

    // 2. Tras crear redirige a /panel/clientes.
    await expect(page).toHaveURL(/\/panel\/clientes$/, { timeout: 15000 });

    // 3. Token con vigencia ~7 días.
    const tokenRow = await getLatestPasswordResetToken(STUDENT_EMAIL);
    expect(tokenRow).toBeTruthy();
    expect(tokenRow!.usedAt).toBeNull();
    const hoursToExpire = (tokenRow!.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursToExpire).toBeGreaterThan(24 * 6);
    expect(hoursToExpire).toBeLessThanOrEqual(24 * 7 + 1);

    // 4. Sesión limpia y reset-password con flag invite.
    await context.clearCookies();
    await page.goto(`/auth/reset-password?token=${tokenRow!.token}&invite=1`);
    await expect(page.getByRole("heading", { name: /crea tu contraseña/i })).toBeVisible();
    // El subtítulo de bienvenida del modo invite también debe aparecer.
    await expect(page.getByText(/define una contraseña para entrar a tu panel/i)).toBeVisible();
    await page.getByLabel("Nueva contraseña").fill(NEW_PASSWORD);
    await page.getByLabel("Confirmar contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /crear contraseña/i }).click();

    await expect(page).toHaveURL(/\/auth\/login\?welcome=1/, { timeout: 10000 });

    // 5. Token usado.
    const tokenAfter = await getLatestPasswordResetToken(STUDENT_EMAIL);
    expect(tokenAfter?.usedAt).not.toBeNull();

    // 6. Login funciona.
    await page.getByLabel(/email/i).fill(STUDENT_EMAIL);
    await page.getByLabel(/contraseña/i).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    await clearTier2LoginAttempts("e2e-test");
    await cleanupTier2PasswordResetData(STUDENT_EMAIL);
  });

  test("/auth/reset-password sin invite=1 muestra copy de 'Nueva contraseña'", async ({ page, context }) => {
    // La ruta es pública; clearCookies para evitar redirects de middleware si
    // el storageState compartido tiene sesión.
    await context.clearCookies();
    await page.goto(`/auth/reset-password?token=anytoken`);
    await expect(page.getByRole("heading", { name: /^nueva contraseña$/i })).toBeVisible({ timeout: 10000 });
    // El subtítulo de invitación NO debe aparecer en modo reset normal.
    await expect(page.getByText(/define una contraseña para entrar a tu panel/i)).toHaveCount(0);
  });
});
