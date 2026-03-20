/**
 * Lista filas de _prisma_migrations (requiere DATABASE_URL en .env).
 * Uso: npx tsx scripts/list-prisma-migrations.ts
 */
import "dotenv/config";
import { prisma } from "../lib/adapters/db/prisma";

async function main() {
  const rows = await prisma.$queryRaw<
    { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
  >`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`;

  console.table(
    rows.map((r) => ({
      migration_name: r.migration_name,
      finished_at: r.finished_at?.toISOString() ?? null,
      rolled_back_at: r.rolled_back_at?.toISOString() ?? null,
    })),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
