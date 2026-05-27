import { test, expect } from "@playwright/test";
import {
  cleanupTier1UsersByEmailPrefix,
  getTier1LatestEmailVerificationToken,
  getTier1UserEmailVerifiedAt,
  getTier1UserRolesByEmail,
} from "./helpers/cleanup";

/**
 * Crear cuenta nueva + flujo de verificación de email.
 *
 * Flujo:
 *  1. Goto /auth/signup, completar email/password, submit.
 *  2. POST /api/auth/signup crea User + EmailVerificationToken + envía mail
 *     (mail no se valida acá; queda fuera de scope). El cliente redirige a
 *     /auth/login?registered=1 (no logueado todavía).
 *  3. Capturar el token recién creado en DB para ese email.
 *  4. Goto /auth/verify-email?token=xxx. La page server-side llama a
 *     `verifyEmail()` y, si OK, hace redirect a /panel?verified=1.
 *     Como NO estamos logueados, el middleware nos manda a /auth/login.
 *     El efecto a verificar es en DB: `User.emailVerifiedAt` quedó seteado.
 *
 * Sesión: vacía (no requerimos sesión). Cleanup: borrar el user creado.
 */
test.describe("Auth — signup + verify email", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const emailPrefix = "e2e-signup-";
  const email = `${emailPrefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = "Test1234!";

  test.afterAll(async () => {
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
  });

  test("signup crea usuario, genera token y verify-email setea emailVerifiedAt", async ({
    page,
  }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Crear cuenta",
    );

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /crear cuenta/i }).click();

    // El componente redirige a /auth/login?registered=1.
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });

    // Capturar token creado por el endpoint de signup.
    const tokenRecord = await getTier1LatestEmailVerificationToken(email);
    test.skip(!tokenRecord, "Sin DB o user no creado en este worker");
    if (!tokenRecord) return;

    // Antes de verificar: emailVerifiedAt debe ser null.
    const verifiedBefore = await getTier1UserEmailVerifiedAt(email);
    expect(verifiedBefore).toBeNull();

    // Goto verify-email con el token. La server page hace verifyEmail() y
    // redirect("/panel?verified=1"); como NO hay sesión, el middleware
    // bouncea a /auth/login. Aceptamos cualquier URL final — lo importante
    // es el efecto persistido en DB.
    await page.goto(`/auth/verify-email?token=${tokenRecord.token}`, {
      waitUntil: "domcontentloaded",
    });

    const verifiedAfter = await getTier1UserEmailVerifiedAt(email);
    expect(verifiedAfter).not.toBeNull();
  });

  test("signup con email ya existente devuelve error 409", async ({ request }) => {
    const fixedEmail = process.env.E2E_USER_EMAIL ?? "admin@e2e.test";
    const res = await request.post("/api/auth/signup", {
      data: {
        email: fixedEmail,
        password: "Test1234!",
        centerId: "e2e-test",
      },
    });
    expect(res.status()).toBe(409);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("EMAIL_IN_USE");
  });

  test("signup con role=ADMINISTRATOR ignora el campo y asigna STUDENT", async ({
    request,
  }) => {
    const attackerEmail = `${emailPrefix}attack-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.test`;
    const res = await request.post("/api/auth/signup", {
      data: {
        email: attackerEmail,
        password: "Test1234!",
        centerId: "e2e-test",
        role: "ADMINISTRATOR",
      },
    });
    expect(res.status()).toBe(201);

    const roles = await getTier1UserRolesByEmail(attackerEmail);
    test.skip(roles.length === 0, "Sin DB en este worker");
    expect(roles).toEqual(["STUDENT"]);
    expect(roles).not.toContain("ADMINISTRATOR");
  });
});
