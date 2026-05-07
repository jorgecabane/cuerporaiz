import { test, expect } from "@playwright/test";

/**
 * Smoke test de role-based access control.
 *
 * Sin sesión: las rutas /panel/* deben redirigir a /auth/login (middleware).
 * Esto cubre las rutas críticas del panel admin.
 *
 * Para verificar el flujo INSTRUCTOR (rol que tiene sesión pero no es admin),
 * ver `e2e/panel-instructor.spec.ts` que ya cubre el sidebar y la home.
 * El test de redirect específico para /panel/horarios/nueva (admin-only) está
 * en `e2e/panel-horarios-nueva-instructor.spec.ts` (gateado por nombre para
 * usar el storage state instructor).
 */
test.describe("Access control — sin sesión redirige a /auth/login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const protectedRoutes = [
    "/panel",
    "/panel/clientes",
    "/panel/horarios",
    "/panel/horarios/nueva",
    "/panel/eventos/nuevo",
    "/panel/pagos",
    "/panel/sitio",
    "/panel/profesores",
    "/panel/disciplinas",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirige a /auth/login sin sesión`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
    });
  }
});
