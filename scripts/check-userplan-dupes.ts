import { prisma } from "@/lib/adapters/db/prisma";
async function main() {
  const dupes: { orderId: string; count: bigint }[] = await prisma.$queryRawUnsafe(`
    SELECT "orderId", COUNT(*) as count FROM "UserPlan"
    WHERE "orderId" IS NOT NULL
    GROUP BY "orderId" HAVING COUNT(*) > 1
  `);
  console.log("Duplicates:", dupes.length);
  if (dupes.length) console.log(JSON.stringify(dupes, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
  const totalUserPlans = await prisma.userPlan.count();
  const withOrder = await prisma.userPlan.count({ where: { orderId: { not: null } } });
  console.log(`Total UserPlan: ${totalUserPlans}, with orderId: ${withOrder}`);
}
main().catch(e => { console.error(e); process.exit(1); });
