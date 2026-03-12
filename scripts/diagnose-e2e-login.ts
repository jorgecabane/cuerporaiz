/**
 * Diagnóstico de login E2E: mismo flujo que auth.ts (authorize) para ver el error real.
 * Uso: npx tsx scripts/diagnose-e2e-login.ts
 * Requiere DATABASE_URL en .env (cargado por dotenv).
 */
import "dotenv/config";
const email = process.env.E2E_USER_EMAIL ?? "admin@cuerporaiz.cl";
const password = process.env.E2E_USER_PASSWORD ?? "admin123";
const centerSlug = process.env.E2E_CENTER_SLUG ?? "cuerporaiz";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env");
    process.exit(1);
  }
  console.log("Credenciales E2E:", { email, centerSlug, hasPassword: !!password });

  const { authService } = await import("../lib/adapters/auth");
  const { centerRepository } = await import("../lib/adapters/db");

  const center = await centerRepository.findBySlug(centerSlug) ?? await centerRepository.findById(centerSlug);
  if (!center) {
    console.error("Centro no encontrado:", centerSlug);
    process.exit(1);
  }
  console.log("Centro OK:", center.id, center.slug);

  try {
    const result = await authService.authenticateWithCredentials(email, password, center.id);
    console.log("Login OK:", { userId: result.user.id, role: result.role, centerId: result.centerId });
  } catch (e) {
    console.error("Login falló:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
