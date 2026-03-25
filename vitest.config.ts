import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**", "**/.worktrees/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      // Scope: unit tests sobre dominio + DTOs + utilidades puras.
      // Casos de uso con infraestructura (DB/HTTP) se cubren con E2E y/o tests de integración aparte.
      include: [
        "lib/domain/**",
        "lib/dto/**",
        "lib/email/**",
        "lib/application/verify-webhook-signature.ts",
        "lib/application/check-email-preference.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "**/e2e/**",
        "**/.worktrees/**",
        "**/lib/adapters/**",
        "**/lib/ports/**",
        "**/lib/email/transactional.ts",
        "**/lib/panel-nav.ts",
        "**/lib/domain/center.ts",
        "**/lib/domain/discipline.ts",
        "**/lib/domain/live-class.ts",
        "**/lib/domain/class-series.ts",
        "**/lib/domain/live-class-series.ts",
        "**/lib/domain/user.ts",
        "**/lib/domain/user-holiday.ts",
        "**/lib/domain/index.ts",
        "**/lib/domain/center-holiday.ts",
        "**/lib/domain/email-preference.ts",
        "**/lib/email/index.ts",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
