import { test, expect } from "@playwright/test";

/**
 * Verifica el RBAC del panel: un INSTRUCTOR no debe acceder a rutas
 * exclusivas de admin (gateadas con `isAdminRole(session.user.role)` →
 * `redirect("/panel")`).
 *
 * Spec gateado por el naming `*instructor*.spec.ts` para correr con la
 * storage state del proyecto `chromium-instructor` (creado por
 * `auth.instructor.setup.ts`).
 */
test.describe("Access control — instructor no entra a rutas admin-only", () => {
  test("/panel/horarios/nueva redirige a /panel para instructor", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    // Tras la redirect del server component, terminamos en /panel.
    await expect(page).toHaveURL(/\/panel(?!\/horarios\/nueva)/, {
      timeout: 15000,
    });
    expect(page.url()).not.toMatch(/\/panel\/horarios\/nueva/);
  });

  test("/panel/clientes redirige a /panel para instructor", async ({ page }) => {
    await page.goto("/panel/clientes");
    await expect(page).toHaveURL(/\/panel(?!\/clientes)/, { timeout: 15000 });
    expect(page.url()).not.toMatch(/\/panel\/clientes/);
  });
});
