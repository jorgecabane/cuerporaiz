/**
 * Diagnóstico rápido de conexión y datos locales.
 * Ejecutar: npx tsx scripts/check-db-local.ts
 * No imprime DATABASE_URL, solo si está definido y si hay datos.
 */
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL no está definido en .env");
  process.exit(1);
}

// Ocultar contraseña al imprimir
const safeUrl = url.replace(/:[^:@]+@/, ":****@");
console.log("✅ DATABASE_URL definido:", safeUrl.split("?")[0] + "?***");

async function main() {
  const { prisma } = await import("../lib/adapters/db/prisma");

  try {
    const [centers, users, plans] = await Promise.all([
      prisma.center.count(),
      prisma.user.count(),
      prisma.plan.count(),
    ]);
    console.log("\n📊 Conteo en DB:");
    console.log("   Centers:", centers);
    console.log("   Users:", users);
    console.log("   Plans:", plans);

    if (centers === 0 && users === 0) {
      console.log("\n⚠️  La base está vacía. Opciones:");
      console.log("   1. Si quieres usar la MISMA base que Vercel: revisa que DATABASE_URL sea idéntico (mismo proyecto Supabase, misma contraseña).");
      console.log("   2. Si es una base local/nueva: ejecutá  npm run db:seed  para cargar datos de prueba.");
    }
  } catch (e) {
    console.error("\n❌ Error al conectar o consultar:", (e as Error).message);
    if ((e as Error).message?.includes("SSL") || (e as Error).message?.includes("certificate")) {
      console.log("   Tip Supabase: probá agregar  ?sslmode=require  al final de DATABASE_URL.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
