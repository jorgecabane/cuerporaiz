/**
 * Backfill: add the "events" CenterSiteSection to every existing center.
 *
 * Idempotent — safe to run multiple times. Skips centers that already have it.
 * Run with: npx tsx prisma/scripts/add-events-section.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const centers = await prisma.center.findMany({ select: { id: true, name: true } });
  console.log(`Found ${centers.length} center(s).`);

  let created = 0;
  let skipped = 0;

  for (const center of centers) {
    const existing = await prisma.centerSiteSection.findUnique({
      where: { centerId_sectionKey: { centerId: center.id, sectionKey: "events" } },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Place "events" right after "on-demand" if it exists; otherwise at the end.
    const onDemand = await prisma.centerSiteSection.findUnique({
      where: { centerId_sectionKey: { centerId: center.id, sectionKey: "on-demand" } },
      select: { sortOrder: true },
    });
    const last = await prisma.centerSiteSection.findFirst({
      where: { centerId: center.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = onDemand ? onDemand.sortOrder + 1 : (last?.sortOrder ?? -1) + 1;

    // Shift following sections down to make room (only when inserting mid-list).
    if (onDemand) {
      await prisma.centerSiteSection.updateMany({
        where: { centerId: center.id, sortOrder: { gte: sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });
    }

    await prisma.centerSiteSection.create({
      data: {
        centerId: center.id,
        sectionKey: "events",
        sortOrder,
        title: "Para vernos en persona",
        subtitle: "Próximos eventos",
        visible: true,
      },
    });

    created++;
    console.log(`  [+] ${center.name} (${center.id}) — added "events" at sortOrder ${sortOrder}`);
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
