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
  // La app usa Prisma + Postgres; en CI usamos 1 worker para no saturar el pool.
  // En local se pueden usar más workers para acortar tiempo (probar con 2–4 si la DB aguanta).
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: (() => {
    const base = [
      {
        name: "setup",
        testMatch: /auth\.setup\.ts/,
      },
    ] as const satisfies Array<Record<string, unknown>>;

    // Los flows student requieren datos/usuario seeded. Para evitar flakiness en pre-commit,
    // se habilitan solo cuando E2E_ENABLE_STUDENT=1.
    if (process.env.E2E_ENABLE_STUDENT === "1") {
      return [
        ...base,
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            storageState: ".auth/admin.json",
          },
          dependencies: ["setup"],
          testIgnore: /auth\.(student|instructor)\.setup\.ts|.*student.*\.spec\.ts|.*instructor.*\.spec\.ts/,
        },
        {
          name: "setup-instructor",
          testMatch: /auth\.instructor\.setup\.ts/,
        },
        {
          name: "chromium-instructor",
          use: {
            ...devices["Desktop Chrome"],
            storageState: ".auth/instructor.json",
          },
          dependencies: ["setup-instructor"],
          testMatch: /.*instructor.*\.spec\.ts/,
          testIgnore: /auth\.instructor\.setup\.ts/,
        },
        {
          name: "setup-student",
          testMatch: /auth\.student\.setup\.ts/,
        },
        {
          name: "chromium-student",
          use: {
            ...devices["Desktop Chrome"],
            storageState: ".auth/student.json",
          },
          dependencies: ["setup-student"],
          // Este proyecto corre SOLO flows de student.
          testMatch: /.*student.*\.spec\.ts/,
          testIgnore: /auth\.(setup|student\.setup)\.ts/,
        },
      ];
    }

    // Default: ignorar archivos de setup student, incluir instructor.
    return [
      ...base,
      {
        name: "chromium",
        use: {
          ...devices["Desktop Chrome"],
          storageState: ".auth/admin.json",
        },
        dependencies: ["setup"],
        testIgnore: /auth\.(student|instructor)\.setup\.ts|.*student.*\.spec\.ts|.*instructor.*\.spec\.ts/,
      },
      {
        name: "setup-instructor",
        testMatch: /auth\.instructor\.setup\.ts/,
      },
      {
        name: "chromium-instructor",
        use: {
          ...devices["Desktop Chrome"],
          storageState: ".auth/instructor.json",
        },
        dependencies: ["setup-instructor"],
        testMatch: /.*instructor.*\.spec\.ts/,
        testIgnore: /auth\.instructor\.setup\.ts/,
      },
    ];
  })(),
  webServer: {
    // Asegura schema + datos base para E2E (en local/CI). Si no hay DB, E2E no puede correr igual.
    command: `rm -rf .next && npx prisma migrate deploy && npm run db:seed && npm run build && PORT=${port} npm run start`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
