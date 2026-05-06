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

/**
 * Garantiza que el centro `e2e-test` exista con un CenterSiteConfig que
 * tenga `logoUrl` seteado al valor pasado. Devuelve el valor anterior para
 * que el caller lo restaure en afterAll. Si la config no existía retorna
 * null.
 */
export async function setCenterLogoUrl(slug: string, logoUrl: string | null): Promise<string | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug } });
  if (!center) return null;
  const existing = await prisma.centerSiteConfig.findUnique({ where: { centerId: center.id } });
  const previous = existing?.logoUrl ?? null;
  if (existing) {
    await prisma.centerSiteConfig.update({
      where: { centerId: center.id },
      data: { logoUrl },
    });
  } else {
    await prisma.centerSiteConfig.create({
      data: { centerId: center.id, logoUrl: logoUrl ?? undefined },
    });
  }
  return previous;
}

/**
 * Crea u obtiene una Order PENDING marcada como TRANSFER lista para que el
 * admin la apruebe/rechace. Devuelve `{ orderId, externalReference, planId, userId }`.
 *
 * - El user es el admin seedeado (admin@e2e.test) — para fines de test, en
 *   producción no compraría planes pero a nivel modelo no hay restricción.
 * - El plan se busca o crea con nombre único basado en `runId`.
 * - El receipt es null por simplicidad (centro de test sin requireReceipt).
 */
export async function seedPendingTransferOrder(opts: {
  centerSlug: string;
  userEmail: string;
  planName: string;
  amountCents?: number;
  /** Prefijo para el externalReference. Default `e2e-tx-`. Útil para que cleanup lo agarre. */
  externalReferencePrefix?: string;
}): Promise<{ orderId: string; externalReference: string; planId: string; userId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const amountCents = opts.amountCents ?? 29900;

  const planSlug = opts.planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug: planSlug } },
    update: {},
    create: {
      centerId: center.id,
      name: opts.planName,
      slug: planSlug,
      description: "Plan E2E para tests de transferencia",
      type: "LIVE",
      amountCents,
      currency: "CLP",
      maxReservations: 4,
      validityDays: 30,
      billingMode: "ONE_TIME",
    },
  });

  const prefix = opts.externalReferencePrefix ?? "e2e-tx-";
  const externalReference = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const order = await prisma.order.create({
    data: {
      centerId: center.id,
      userId: user.id,
      planId: plan.id,
      amountCents,
      currency: "CLP",
      status: "PENDING",
      paymentMethod: "TRANSFER",
      transferClaimedAt: new Date(),
      externalReference,
    },
  });
  return { orderId: order.id, externalReference, planId: plan.id, userId: user.id };
}

/**
 * Estado del plugin de transferencia bancaria del centro `slug`. Útil para
 * setup/teardown en tests del flujo de transferencia.
 */
export interface BankTransferSnapshot {
  enabled: boolean;
  acceptPlans: boolean;
  acceptEvents: boolean;
  requireReceipt: boolean;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
}

/** Captura el estado actual del plugin transferencia para restaurarlo después. */
export async function snapshotBankTransfer(slug: string): Promise<BankTransferSnapshot | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug } });
  if (!center) return null;
  return {
    enabled: center.bankTransferEnabled,
    acceptPlans: center.bankTransferAcceptPlans,
    acceptEvents: center.bankTransferAcceptEvents,
    requireReceipt: center.bankTransferRequireReceipt,
    bankName: center.bankName,
    bankAccountType: center.bankAccountType,
    bankAccountNumber: center.bankAccountNumber,
    bankAccountHolder: center.bankAccountHolder,
    bankAccountRut: center.bankAccountRut,
    bankAccountEmail: center.bankAccountEmail,
  };
}

/** Aplica un set de overrides al plugin transferencia. */
export async function setBankTransfer(
  slug: string,
  overrides: Partial<BankTransferSnapshot>,
): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;
  const center = await prisma.center.findUnique({ where: { slug } });
  if (!center) return;
  await prisma.center.update({
    where: { id: center.id },
    data: {
      ...(overrides.enabled !== undefined && { bankTransferEnabled: overrides.enabled }),
      ...(overrides.acceptPlans !== undefined && { bankTransferAcceptPlans: overrides.acceptPlans }),
      ...(overrides.acceptEvents !== undefined && { bankTransferAcceptEvents: overrides.acceptEvents }),
      ...(overrides.requireReceipt !== undefined && {
        bankTransferRequireReceipt: overrides.requireReceipt,
      }),
      ...(overrides.bankName !== undefined && { bankName: overrides.bankName }),
      ...(overrides.bankAccountType !== undefined && { bankAccountType: overrides.bankAccountType }),
      ...(overrides.bankAccountNumber !== undefined && {
        bankAccountNumber: overrides.bankAccountNumber,
      }),
      ...(overrides.bankAccountHolder !== undefined && {
        bankAccountHolder: overrides.bankAccountHolder,
      }),
      ...(overrides.bankAccountRut !== undefined && { bankAccountRut: overrides.bankAccountRut }),
      ...(overrides.bankAccountEmail !== undefined && {
        bankAccountEmail: overrides.bankAccountEmail,
      }),
    },
  });
}

/**
 * Crea un Plan listo para ser comprado vía /panel/tienda. Idempotente por slug.
 * Devuelve `{ id, name, slug, amountCents }`.
 */
export async function seedPlan(opts: {
  centerSlug: string;
  name: string;
  amountCents?: number;
  validityDays?: number;
}): Promise<{ id: string; name: string; slug: string; amountCents: number } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const slug = opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const amountCents = opts.amountCents ?? 29900;
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug } },
    update: {},
    create: {
      centerId: center.id,
      name: opts.name,
      slug,
      description: "Plan E2E",
      type: "LIVE",
      amountCents,
      currency: "CLP",
      maxReservations: 4,
      validityDays: opts.validityDays ?? 30,
      billingMode: "ONE_TIME",
    },
  });
  return { id: plan.id, name: plan.name, slug: plan.slug, amountCents: plan.amountCents };
}

/**
 * Crea un evento PUBLISHED listo para ser reservado/comprado en E2E.
 * `amountCents=0` → evento gratis. >0 → evento pagado.
 * Devuelve `{ id, title }`.
 */
export async function seedEvent(opts: {
  centerSlug: string;
  title: string;
  amountCents: number;
  maxCapacity?: number | null;
}): Promise<{ id: string; title: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 7);
  startsAt.setHours(10, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setHours(12, 0, 0, 0);
  const event = await prisma.event.create({
    data: {
      centerId: center.id,
      title: opts.title,
      description: "Evento E2E",
      location: "Sala de pruebas",
      startsAt,
      endsAt,
      amountCents: opts.amountCents,
      currency: "CLP",
      maxCapacity: opts.maxCapacity ?? null,
      status: "PUBLISHED",
    },
  });
  return { id: event.id, title: event.title };
}

/** Limpia la Order y el plan de test creados por seedPendingTransferOrder. */
export async function cleanupPendingTransferOrders(externalReferencePrefix: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const orders = await prisma.order.findMany({
    where: { externalReference: { startsWith: externalReferencePrefix } },
  });
  for (const o of orders) {
    await prisma.userPlan.deleteMany({ where: { orderId: o.id } }).catch(() => {});
    await prisma.manualPayment.deleteMany({ where: { userPlanId: { not: null } } }).catch(() => {});
    await prisma.order.delete({ where: { id: o.id } }).catch(() => {});
  }
}
