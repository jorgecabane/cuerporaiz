import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración E2E para CuerpoRaíz.
 * Puerto por defecto 3000; si E2E_PORT está definido (ej. en pre-commit para no chocar con dev en 3000) se usa ese.
 * @see https://playwright.dev/docs/test-configuration
 */
const port = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `PORT=${port} npm run dev`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
