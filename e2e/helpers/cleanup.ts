/**
 * E2E cleanup helpers — use Prisma directly to remove test data.
 * Called in afterAll as a safety net: even if UI cleanup tests fail,
 * this ensures no E2E data is left behind.
 *
 * Nota: no se reusa `lib/adapters/db/prisma` porque Playwright no compila
 * fuera de `e2e/`. Aquí creamos un cliente dedicado para los workers.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let envLoaded = false;
function ensureEnvLoaded() {
  if (envLoaded) return;
  loadEnvConfig(process.cwd());
  envLoaded = true;
}

let cachedPrisma: PrismaClient | null | undefined;
async function getPrisma(): Promise<PrismaClient | null> {
  if (cachedPrisma !== undefined) return cachedPrisma;
  ensureEnvLoaded();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    cachedPrisma = null;
    return null;
  }
  const adapter = new PrismaPg({ connectionString });
  cachedPrisma = new PrismaClient({ adapter });
  return cachedPrisma;
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

/** Delete plans (and associated quotas + userPlans/orders/subs) matching a name pattern */
export async function cleanupPlans(namePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const plans = await prisma.plan.findMany({
    where: { name: { contains: namePattern } },
  });
  for (const plan of plans) {
    await prisma.planCategoryQuota.deleteMany({ where: { planId: plan.id } });
    // Remove dependents so the hard delete succeeds even if tests created a UserPlan
    await prisma.userPlan.deleteMany({ where: { planId: plan.id } });
    await prisma.order.deleteMany({ where: { planId: plan.id } });
    await prisma.subscription.deleteMany({ where: { planId: plan.id } });
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
  }
}

/**
 * Crea un UserPlan activo para que un test pueda comprobar la lógica de "deshabilitar
 * plan con alumnos vinculados". Retorna el id del UserPlan creado (para cleanup).
 * Busca cualquier usuario STUDENT del centro del plan; si no hay, lanza.
 */
export async function seedUserPlanForPlan(planId: string): Promise<string> {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("No DB for E2E");
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error(`Plan ${planId} no encontrado`);
  const studentMembership = await prisma.userCenterRole.findFirst({
    where: { centerId: plan.centerId, role: "STUDENT" },
  });
  if (!studentMembership) throw new Error(`No hay STUDENT en centro ${plan.centerId}`);
  const userPlan = await prisma.userPlan.create({
    data: {
      userId: studentMembership.userId,
      planId: plan.id,
      centerId: plan.centerId,
      status: "ACTIVE",
      paymentStatus: "PAID",
      classesTotal: plan.maxReservations,
      classesUsed: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return userPlan.id;
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
