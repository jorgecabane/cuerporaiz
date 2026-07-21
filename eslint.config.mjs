import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next.
    // `.next` va con glob recursivo: los worktrees tienen su propio build
    // anidado y un patrón anclado a la raíz no los alcanza.
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/generated/**",
    "coverage/**",
    // Local git worktrees (Cursor skill / dev workflow). Son checkouts
    // separados con su propio lint; incluirlos aquí hacía que eslint
    // recorriera GBs de artefactos de build hasta quedarse sin heap.
    ".worktrees/**",
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
