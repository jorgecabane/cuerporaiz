import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración E2E para CuerpoRaíz.
 * Puerto por defecto 3000; si E2E_PORT está definido (ej. en pre-commit para no chocar con dev en 3000) se usa ese.
 *
 * Usa storageState para compartir sesión: el proyecto "setup" hace login una vez
 * y guarda cookies en .auth/admin.json. Los tests autenticados la reutilizan.
 *
 * @see https://playwright.dev/docs/auth
 */
const port = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 4,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: `npm run build && PORT=${port} npm run start`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
