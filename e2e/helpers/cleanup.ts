/**
 * E2E cleanup helpers — use Prisma directly to remove test data.
 * Called in afterAll as a safety net: even if UI cleanup tests fail,
 * this ensures no E2E data is left behind.
 */

async function getPrisma() {
  if (!process.env.DATABASE_URL && !process.env.DIRECT_DATABASE_URL) return null;
  const { prisma } = await import("../../lib/adapters/db/prisma");
  return prisma;
}

/** Delete on-demand categories (cascades to practices + lessons) matching a name pattern */
export async function cleanupCategories(namePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const categories = await prisma.onDemandCategory.findMany({
    where: { name: { contains: namePattern } },
  });
  for (const cat of categories) {
    // Delete lessons → practices → category (respecting FK constraints)
    const practices = await prisma.onDemandPractice.findMany({ where: { categoryId: cat.id } });
    for (const p of practices) {
      await prisma.onDemandLesson.deleteMany({ where: { practiceId: p.id } });
    }
    await prisma.onDemandPractice.deleteMany({ where: { categoryId: cat.id } });
    await prisma.onDemandCategory.delete({ where: { id: cat.id } });
  }
}

/** Delete disciplines matching a name pattern */
export async function cleanupDisciplines(namePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  await prisma.discipline.deleteMany({
    where: { name: { contains: namePattern } },
  });
}

/** Delete plans (and associated quotas) matching a name pattern */
export async function cleanupPlans(namePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const plans = await prisma.plan.findMany({
    where: { name: { contains: namePattern } },
  });
  for (const plan of plans) {
    await prisma.planCategoryQuota.deleteMany({ where: { planId: plan.id } });
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
  }
}

/** Delete live classes matching a title pattern */
export async function cleanupLiveClasses(titlePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const classes = await prisma.liveClass.findMany({
    where: { title: { contains: titlePattern } },
  });
  for (const cls of classes) {
    await prisma.reservation.deleteMany({ where: { liveClassId: cls.id } });
    await prisma.liveClass.delete({ where: { id: cls.id } }).catch(() => {});
  }
}

/** Delete events (cascades to tickets) matching a title pattern */
export async function cleanupEvents(titlePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const events = await prisma.event.findMany({
    where: { title: { contains: titlePattern } },
  });
  for (const evt of events) {
    await prisma.eventTicket.deleteMany({ where: { eventId: evt.id } });
    await prisma.event.delete({ where: { id: evt.id } }).catch(() => {});
  }
}
