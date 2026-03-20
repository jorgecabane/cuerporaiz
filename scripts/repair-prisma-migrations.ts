/**
 * Repara historial de migraciones en Supabase cuando init_postgres quedó duplicado / rolled back
 * y el esquema real viene del baseline. Luego marca como aplicadas las migraciones intermedias
 * y ejecuta migrate deploy (p. ej. center_policy_minutes).
 *
 * Uso: npx tsx scripts/repair-prisma-migrations.ts
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { prisma } from "../lib/adapters/db/prisma";

const TO_MARK_APPLIED = [
  "20260310120000_init_postgres",
  "20260311021122_add_live_classes_and_reservations",
  "20260311021241_add_mercadopago_checkout_plans_orders_webhooks",
  "20260311030000_rename_role_enum_to_english",
  "20260312100000_rename_role_enum_to_english",
  "20260312160529_add_subscription_model",
  "20260313000000_add_center_policy_fields",
  "20260315000000_add_zoom_google_meet_config",
  "20260315180000_add_user_image_url",
] as const;

function run(cmd: string) {
  console.log("\n$", cmd);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

async function main() {
  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "_prisma_migrations" WHERE migration_name = '20260310120000_init_postgres'`,
  );
  console.log(`Eliminadas ${deleted} fila(s) de init_postgres en _prisma_migrations.`);

  for (const name of TO_MARK_APPLIED) {
    try {
      run(`npx prisma migrate resolve --applied "${name}"`);
    } catch {
      console.error(`Falló resolve --applied para ${name} (¿ya estaba aplicada?). Continuando…`);
    }
  }

  run("npx prisma migrate deploy");
  run("npx prisma generate");

  console.log("\nListo. Verificá con: npx tsx scripts/list-prisma-migrations.ts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
