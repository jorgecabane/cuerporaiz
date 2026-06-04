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

/**
 * Cliente Prisma para specs E2E que necesitan hablar directo con la BD
 * (sin pasar por la UI/API). Lazy-loads .env. Tira si no hay DATABASE_URL.
 */
export async function getE2EPrisma(): Promise<PrismaClient> {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("E2E: DATABASE_URL no configurada");
  return prisma;
}

// ─── Convención E2E para crear users ─────────────────────────────────────────
// Tras el gate C6 (commit ca08281) el login por credentials lanza
// EmailNotVerifiedError si el user no tiene emailVerifiedAt. Como los tests
// que usan `playwright.request.newContext()` heredan el storageState del
// proyecto (cookies admin), un login fallido deja cookies admin colgadas y
// los asserts contra endpoints admin reciben 200 en vez del 4xx esperado.
//
// REGLA: cualquier helper nuevo que cree un User E2E DEBE pasar por
// `ensureE2EUser` (que setea emailVerifiedAt y la membership). No usar
// prisma.user.upsert + userCenterRole.upsert directo.

/**
 * Hashea un password para uso en E2E (bcrypt 12, igual al seed). Reutilizá
 * el hash entre múltiples `ensureE2EUser` cuando crees N users con el mismo
 * password (bulk seeds) para evitar pagar el costo N veces.
 */
export async function hashE2EPassword(plain: string): Promise<string> {
  const bcryptMod = await import("bcryptjs");
  return bcryptMod.default.hash(plain, 12);
}

/**
 * Crea o reutiliza un User E2E + UserCenterRole. SIEMPRE setea
 * `emailVerifiedAt` (ver convención arriba).
 *
 * @param rotateOnExisting Si true, en update rota passwordHash y bumpea
 *   tokenVersion (invalida sesiones previas). Usar en flows de auth donde
 *   distintos tests setean passwords diferentes para el mismo email.
 */
export async function ensureE2EUser(opts: {
  centerId: string;
  email: string;
  passwordHash: string;
  name?: string;
  role: "ADMINISTRATOR" | "INSTRUCTOR" | "STUDENT";
  rotateOnExisting?: boolean;
}): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const verifiedAt = new Date();
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    create: {
      email: opts.email,
      passwordHash: opts.passwordHash,
      name: opts.name ?? "E2E User",
      emailVerifiedAt: verifiedAt,
    },
    update: opts.rotateOnExisting
      ? {
          passwordHash: opts.passwordHash,
          tokenVersion: { increment: 1 },
          emailVerifiedAt: verifiedAt,
        }
      : { emailVerifiedAt: verifiedAt },
  });
  await prisma.userCenterRole.upsert({
    where: { userId_centerId: { userId: user.id, centerId: opts.centerId } },
    create: { userId: user.id, centerId: opts.centerId, role: opts.role },
    update: { role: opts.role },
  });
  return { id: user.id };
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
  /** Si se pasa, overridea el default (7 días, 10:00 local del server). */
  startsAt?: Date;
  endsAt?: Date;
}): Promise<{ id: string; title: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  let startsAt: Date;
  let endsAt: Date;
  if (opts.startsAt && opts.endsAt) {
    startsAt = opts.startsAt;
    endsAt = opts.endsAt;
  } else {
    startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 7);
    startsAt.setHours(10, 0, 0, 0);
    endsAt = new Date(startsAt);
    endsAt.setHours(12, 0, 0, 0);
  }
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

/**
 * Crea un EventTicket en estado arbitrario para el usuario por email. Útil
 * para tests de regresión del flujo de checkout (p.ej. reuso de PENDING).
 * Devuelve `{ id }` o null si la BD no está disponible.
 */
export async function seedEventTicket(opts: {
  eventId: string;
  userEmail: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  amountCents: number;
  quantity?: number;
}): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  // Si ya existe (unique en eventId+userId), lo reusamos seteándolo al estado pedido.
  const existing = await prisma.eventTicket.findUnique({
    where: { eventId_userId: { eventId: opts.eventId, userId: user.id } },
  });
  if (existing) {
    const updated = await prisma.eventTicket.update({
      where: { id: existing.id },
      data: {
        status: opts.status,
        amountCents: opts.amountCents,
        quantity: opts.quantity ?? 1,
        paidAt: opts.status === "PAID" ? new Date() : null,
        transferClaimedAt: null,
        transferReceiptSanityId: null,
        transferRejectedReason: null,
        mpPaymentId: null,
      },
    });
    return { id: updated.id };
  }
  const ticket = await prisma.eventTicket.create({
    data: {
      eventId: opts.eventId,
      userId: user.id,
      amountCents: opts.amountCents,
      currency: "CLP",
      status: opts.status,
      quantity: opts.quantity ?? 1,
      paidAt: opts.status === "PAID" ? new Date() : null,
    },
  });
  return { id: ticket.id };
}

/** Borra todos los EventTickets de un evento. */
export async function cleanupEventTickets(eventId: string): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;
  await prisma.eventTicket.deleteMany({ where: { eventId } });
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

// ─── Tier 1 helpers ────────────────────────────────────────────────────────
// Prefijo `seedTier1*` para evitar colisión con otros agentes en paralelo.

/**
 * Crea una Order PENDING vía MERCADOPAGO con `mpPreferenceId` simulado.
 * Asegura que el plugin MP del centro esté habilitado. Útil para tests de
 * aprobación manual del path APPROVED → UserPlan ACTIVE.
 */
export async function seedTier1PendingMpOrder(opts: {
  centerSlug: string;
  userEmail: string;
  planName: string;
  amountCents?: number;
  externalReferencePrefix?: string;
}): Promise<{
  orderId: string;
  externalReference: string;
  mpPreferenceId: string;
  planId: string;
  userId: string;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const amountCents = opts.amountCents ?? 29900;

  await prisma.centerMercadoPagoConfig.upsert({
    where: { centerId: center.id },
    create: {
      centerId: center.id,
      accessToken: "TEST-mp-access-token",
      enabled: true,
    },
    update: {},
  });

  const planSlug = opts.planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug: planSlug } },
    update: {},
    create: {
      centerId: center.id,
      name: opts.planName,
      slug: planSlug,
      description: "Plan E2E Tier 1 webhook MP",
      type: "LIVE",
      amountCents,
      currency: "CLP",
      maxReservations: 4,
      validityDays: 30,
      billingMode: "ONE_TIME",
    },
  });

  const prefix = opts.externalReferencePrefix ?? "e2e-tier1-mp-";
  const externalReference = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mpPreferenceId = `pref_e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const order = await prisma.order.create({
    data: {
      centerId: center.id,
      userId: user.id,
      planId: plan.id,
      amountCents,
      currency: "CLP",
      status: "PENDING",
      paymentMethod: "MERCADOPAGO",
      externalReference,
      mpPreferenceId,
    },
  });
  return {
    orderId: order.id,
    externalReference,
    mpPreferenceId,
    planId: plan.id,
    userId: user.id,
  };
}

/**
 * Crea una LiveClass futura del centro.
 * `daysFromNow=2, hour=10` → en 2 días a las 10:00 hora local del server.
 * Para tests donde la clase debe ser reservable dentro de la ventana
 * `bookBeforeMinutes`, considerar el setting del centro (default 1440 = 24 h).
 */
export async function seedTier1LiveClass(opts: {
  centerSlug: string;
  title: string;
  daysFromNow?: number;
  /** Si se setea, override exacto de minutos desde ahora (positivo en el futuro). */
  minutesFromNow?: number;
  hour?: number;
  durationMinutes?: number;
  maxCapacity?: number;
}): Promise<{ liveClassId: string; startsAt: Date; centerId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;

  let startsAt: Date;
  if (typeof opts.minutesFromNow === "number") {
    startsAt = new Date(Date.now() + opts.minutesFromNow * 60 * 1000);
  } else {
    const days = opts.daysFromNow ?? 2;
    const hour = opts.hour ?? 10;
    startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + days);
    startsAt.setHours(hour, 0, 0, 0);
  }

  const liveClass = await prisma.liveClass.create({
    data: {
      centerId: center.id,
      title: opts.title,
      startsAt,
      durationMinutes: opts.durationMinutes ?? 60,
      maxCapacity: opts.maxCapacity ?? 10,
    },
  });
  return { liveClassId: liveClass.id, startsAt, centerId: center.id };
}

/**
 * Crea (o reutiliza) un usuario STUDENT del centro y le asigna un UserPlan
 * ACTIVE con clases disponibles.
 * Si el email ya existe lo reutiliza (asegura el role STUDENT en el centro).
 */
export async function seedTier1StudentWithActivePlan(opts: {
  centerSlug: string;
  email: string;
  password?: string;
  name?: string;
  classesTotal?: number;
  classesUsed?: number;
  planName?: string;
}): Promise<{ userId: string; userPlanId: string; planId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;

  const passwordHash = await hashE2EPassword(opts.password ?? "Test1234!");
  const ensured = await ensureE2EUser({
    centerId: center.id,
    email: opts.email,
    passwordHash,
    name: opts.name ?? "Student Tier1",
    role: "STUDENT",
  });
  if (!ensured) return null;
  const user = { id: ensured.id };

  const planName = opts.planName ?? `Tier1 Plan ${Date.now()}`;
  const planSlug = planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug: planSlug } },
    create: {
      centerId: center.id,
      name: planName,
      slug: planSlug,
      description: "Plan Tier1 E2E",
      type: "LIVE",
      amountCents: 29900,
      currency: "CLP",
      maxReservations: opts.classesTotal ?? 4,
      validityDays: 30,
      billingMode: "ONE_TIME",
    },
    update: {},
  });

  const userPlan = await prisma.userPlan.create({
    data: {
      userId: user.id,
      planId: plan.id,
      centerId: center.id,
      status: "ACTIVE",
      paymentStatus: "PAID",
      classesTotal: opts.classesTotal ?? 4,
      classesUsed: opts.classesUsed ?? 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { userId: user.id, userPlanId: userPlan.id, planId: plan.id };
}

/**
 * Asigna un UserPlan ACTIVE a un usuario existente (busca por email).
 * Devuelve el id. Útil para que admin@e2e.test pueda reservar como "buyer".
 */
export async function seedTier1UserPlanForExistingUser(opts: {
  centerSlug: string;
  userEmail: string;
  classesTotal?: number;
  classesUsed?: number;
  planName?: string;
}): Promise<{ userId: string; userPlanId: string; planId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;

  const planName = opts.planName ?? `Tier1 Plan ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const planSlug = planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug: planSlug } },
    create: {
      centerId: center.id,
      name: planName,
      slug: planSlug,
      description: "Plan Tier1 E2E",
      type: "LIVE",
      amountCents: 29900,
      currency: "CLP",
      maxReservations: opts.classesTotal ?? 4,
      validityDays: 30,
      billingMode: "ONE_TIME",
    },
    update: {},
  });

  const userPlan = await prisma.userPlan.create({
    data: {
      userId: user.id,
      planId: plan.id,
      centerId: center.id,
      status: "ACTIVE",
      paymentStatus: "PAID",
      classesTotal: opts.classesTotal ?? 4,
      classesUsed: opts.classesUsed ?? 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return { userId: user.id, userPlanId: userPlan.id, planId: plan.id };
}

/** Crea una Reservation CONFIRMED para un user/clase/plan dados. */
export async function seedTier1Reservation(opts: {
  userId: string;
  liveClassId: string;
  userPlanId: string;
  /** Si true, además incrementa classesUsed del plan en +1 (simula reserva real). */
  incrementClassesUsed?: boolean;
}): Promise<{ reservationId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const reservation = await prisma.reservation.create({
    data: {
      userId: opts.userId,
      liveClassId: opts.liveClassId,
      userPlanId: opts.userPlanId,
      status: "CONFIRMED",
    },
  });
  if (opts.incrementClassesUsed) {
    await prisma.userPlan.update({
      where: { id: opts.userPlanId },
      data: { classesUsed: { increment: 1 } },
    });
  }
  return { reservationId: reservation.id };
}

/** Override temporal de `bookBeforeMinutes` y `cancelBeforeMinutes` del centro. */
export async function setTier1CenterPolicies(
  slug: string,
  overrides: {
    bookBeforeMinutes?: number;
    cancelBeforeMinutes?: number;
  },
): Promise<{ bookBeforeMinutes: number; cancelBeforeMinutes: number } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug } });
  if (!center) return null;
  const previous = {
    bookBeforeMinutes: center.bookBeforeMinutes,
    cancelBeforeMinutes: center.cancelBeforeMinutes,
  };
  await prisma.center.update({
    where: { id: center.id },
    data: {
      ...(overrides.bookBeforeMinutes !== undefined && {
        bookBeforeMinutes: overrides.bookBeforeMinutes,
      }),
      ...(overrides.cancelBeforeMinutes !== undefined && {
        cancelBeforeMinutes: overrides.cancelBeforeMinutes,
      }),
    },
  });
  return previous;
}

/** Lee el último EmailVerificationToken creado para un user (por email). */
export async function getTier1LatestEmailVerificationToken(
  userEmail: string,
): Promise<{ token: string; expiresAt: Date; userId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return null;
  const token = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return null;
  return { token: token.token, expiresAt: token.expiresAt, userId: user.id };
}

/** Lee `emailVerifiedAt` de un user por email. */
export async function getTier1UserEmailVerifiedAt(
  userEmail: string,
): Promise<Date | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { emailVerifiedAt: true },
  });
  return user?.emailVerifiedAt ?? null;
}

/** Lista los roles UserCenterRole.role del usuario en cualquier centro. */
export async function getTier1UserRolesByEmail(
  userEmail: string,
): Promise<string[]> {
  const prisma = await getPrisma();
  if (!prisma) return [];
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { memberships: { select: { role: true } } },
  });
  return user?.memberships.map((m) => m.role) ?? [];
}

/** Lee una Order por id (para asserts de status post-action). */
export async function getTier1OrderById(orderId: string): Promise<{
  status: string;
  paymentMethod: string;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentMethod: true },
  });
  if (!order) return null;
  return { status: order.status, paymentMethod: order.paymentMethod };
}

/**
 * Lee el UserPlan creado para una Order específica (ACTIVE + PAID tras
 * activatePlanForOrder).
 */
export async function getTier1UserPlanByOrderId(orderId: string): Promise<{
  id: string;
  status: string;
  paymentStatus: string;
  classesTotal: number | null;
  classesUsed: number;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const up = await prisma.userPlan.findFirst({
    where: { orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      classesTotal: true,
      classesUsed: true,
    },
  });
  return up;
}

/** Lee una Reservation por id (status, userPlanId). */
export async function getTier1ReservationById(reservationId: string): Promise<{
  status: string;
  userPlanId: string | null;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { status: true, userPlanId: true },
  });
  return r;
}

/** Lee UserPlan.classesUsed por id. */
export async function getTier1UserPlanClassesUsed(
  userPlanId: string,
): Promise<number | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const up = await prisma.userPlan.findUnique({
    where: { id: userPlanId },
    select: { classesUsed: true },
  });
  return up?.classesUsed ?? null;
}

/**
 * Borra usuarios cuyo email empiece con `prefix`. Protege explícitamente
 * `admin@e2e.test`, `student@e2e.test`, `instructor@e2e.test`.
 * Cascadea relaciones via FK (UserPlan, Reservation, Order, etc.).
 */
export async function cleanupTier1UsersByEmailPrefix(prefix: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const PROTECTED = new Set([
    "admin@e2e.test",
    "student@e2e.test",
    "instructor@e2e.test",
  ]);
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true, email: true },
  });
  for (const u of users) {
    if (PROTECTED.has(u.email)) continue;
    // Borrar dependientes que no cascadean por FK estricta (Order/Plan/UserPlan).
    await prisma.reservation.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.userPlan.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.manualPayment.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.order.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.subscription.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.emailVerificationToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.passwordResetToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.userCenterRole.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
}

/** Borra Reservations por id. Si pasa array vacío, no hace nada. */
export async function cleanupTier1Reservations(reservationIds: string[]) {
  const prisma = await getPrisma();
  if (!prisma || reservationIds.length === 0) return;
  await prisma.reservation
    .deleteMany({ where: { id: { in: reservationIds } } })
    .catch(() => {});
}

/** Borra LiveClasses por id (cascadea Reservations). */
export async function cleanupTier1LiveClasses(liveClassIds: string[]) {
  const prisma = await getPrisma();
  if (!prisma || liveClassIds.length === 0) return;
  await prisma.reservation
    .deleteMany({ where: { liveClassId: { in: liveClassIds } } })
    .catch(() => {});
  await prisma.liveClass
    .deleteMany({ where: { id: { in: liveClassIds } } })
    .catch(() => {});
}

// ─── Tier 2 + Tier 3 helpers ─────────────────────────────────────────────────

/**
 * Asegura un CenterMercadoPagoConfig habilitado para que el webhook pueda
 * procesar suscripciones. Idempotente.
 */
async function ensureMercadoPagoConfig(centerId: string): Promise<boolean> {
  const prisma = await getPrisma();
  if (!prisma) return false;
  const existing = await prisma.centerMercadoPagoConfig.findUnique({ where: { centerId } });
  if (existing) {
    if (!existing.enabled) {
      await prisma.centerMercadoPagoConfig.update({
        where: { centerId },
        data: { enabled: true },
      });
    }
    return true;
  }
  await prisma.centerMercadoPagoConfig.create({
    data: {
      centerId,
      accessToken: "TEST-AT-tier2",
      enabled: true,
    },
  });
  return true;
}

/**
 * Crea un Plan recurrente + Subscription PENDING para el user dado, listo
 * para que un webhook simulado de MercadoPago lo active.
 */
export async function seedTier2PendingSubscription(opts: {
  centerSlug: string;
  userEmail: string;
  planName: string;
}): Promise<{
  subscriptionId: string;
  mpSubscriptionId: string;
  planId: string;
  userId: string;
  centerId: string;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;

  const ok = await ensureMercadoPagoConfig(center.id);
  if (!ok) return null;

  const slug = opts.planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug } },
    update: {},
    create: {
      centerId: center.id,
      name: opts.planName,
      slug,
      description: "Plan recurrente E2E (Tier2)",
      type: "LIVE",
      amountCents: 19900,
      currency: "CLP",
      maxReservations: 8,
      validityDays: 30,
      billingMode: "RECURRING",
    },
  });

  const mpSubscriptionId = `tier2-mp-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const sub = await prisma.subscription.create({
    data: {
      centerId: center.id,
      userId: user.id,
      planId: plan.id,
      mpSubscriptionId,
      status: "PENDING",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    subscriptionId: sub.id,
    mpSubscriptionId,
    planId: plan.id,
    userId: user.id,
    centerId: center.id,
  };
}

/** Borra Subscriptions + UserPlans + Orders asociados a un mpSubscriptionId. */
export async function cleanupTier2Subscription(mpSubscriptionId: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const sub = await prisma.subscription.findUnique({ where: { mpSubscriptionId } });
  if (!sub) return;
  await prisma.userPlan.deleteMany({ where: { subscriptionId: sub.id } }).catch(() => {});
  await prisma.order.deleteMany({ where: { subscriptionId: sub.id } }).catch(() => {});
  await prisma.subscription.delete({ where: { id: sub.id } }).catch(() => {});
}

/** Lee el estado de una Subscription por mpSubscriptionId. */
export async function getTier2SubscriptionStatus(
  mpSubscriptionId: string,
): Promise<string | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const sub = await prisma.subscription.findUnique({ where: { mpSubscriptionId } });
  return sub?.status ?? null;
}

/** Lee el primer UserPlan no-CANCELLED asociado a una subscription. */
export async function getTier2UserPlanForSubscription(
  subscriptionId: string,
): Promise<{ id: string; status: string; paymentStatus: string; planId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const up = await prisma.userPlan.findFirst({ where: { subscriptionId } });
  if (!up) return null;
  return {
    id: up.id,
    status: up.status,
    paymentStatus: up.paymentStatus,
    planId: up.planId,
  };
}

/**
 * Lee el último PasswordResetToken creado para `userEmail`. Retorna `null` si
 * no hay (o no hay DB en este worker).
 */
export async function getLatestPasswordResetToken(
  userEmail: string,
): Promise<{ id: string; token: string; expiresAt: Date; usedAt: Date | null } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return null;
  const t = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!t) return null;
  return { id: t.id, token: t.token, expiresAt: t.expiresAt, usedAt: t.usedAt };
}

/**
 * Crea un PasswordResetToken arbitrario (token y expiresAt provistos) para
 * testear flujos de "expirado" o "ya usado". Usa `markUsed=true` para
 * setear `usedAt = new Date()`.
 */
export async function seedTier2PasswordResetToken(opts: {
  userEmail: string;
  token: string;
  expiresAt: Date;
  markUsed?: boolean;
}): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const created = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: opts.token,
      expiresAt: opts.expiresAt,
      usedAt: opts.markUsed ? new Date() : null,
    },
  });
  return { id: created.id };
}

/**
 * Borra PasswordResetTokens + LoginAttempts asociados a `userEmail`. Útil
 * para no contaminar otros tests con rate-limit residual o tokens viejos.
 */
export async function cleanupTier2PasswordResetData(userEmail: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return;
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.loginAttempt.deleteMany({ where: { email: userEmail } }).catch(() => {});
}

/**
 * Borra TODOS los LoginAttempts del centro `centerSlug`. Útil para resetear
 * el rate limit de auth (5 attempts/15min) entre runs de tests que loguean
 * múltiples veces como el mismo usuario (auth.setup, auth.spec, panel-mi-cuenta).
 * El seed.ts ya hace esto al inicio del e2e, pero conviene exponerlo para
 * tests específicos que lo necesiten.
 */
export async function clearTier2LoginAttempts(centerSlug: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const center = await prisma.center.findUnique({ where: { slug: centerSlug } });
  if (!center) return;
  await prisma.loginAttempt.deleteMany({ where: { centerId: center.id } }).catch(() => {});
}

/**
 * Restaura el passwordHash del usuario al hash de la contraseña dada. Útil
 * en afterAll para no romper el storageState compartido.
 */
export async function setUserPassword(userEmail: string, plainPassword: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(plainPassword, 12);
  await prisma.user.update({
    where: { email: userEmail },
    data: { passwordHash: hash, tokenVersion: { increment: 1 } },
  });
}

/**
 * Crea (idempotente) un usuario STUDENT dedicado para tests de password
 * reset, con email único. Devuelve `{ email, password }`.
 */
export async function seedTier2ResetUser(opts: {
  centerSlug: string;
  emailPrefix: string;
  initialPassword: string;
}): Promise<{ email: string; password: string; userId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const passwordHash = await hashE2EPassword(opts.initialPassword);
  const email = `${opts.emailPrefix}@e2e.test`;
  const ensured = await ensureE2EUser({
    centerId: center.id,
    email,
    passwordHash,
    name: "Reset E2E",
    role: "STUDENT",
    rotateOnExisting: true,
  });
  if (!ensured) return null;
  return { email, password: opts.initialPassword, userId: ensured.id };
}

/** Borra un usuario y sus dependientes. */
export async function cleanupTier2User(userEmail: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return;
  // userCenterRole y derivados se borran via cascade FK.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.loginAttempt.deleteMany({ where: { email: userEmail } }).catch(() => {});
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
}

/**
 * Crea un UserPlan EXPIRADO (status="EXPIRED", validUntil en el pasado) para
 * `userEmail` en `centerSlug`. Usa el primer plan existente o crea uno con
 * `planName`. Retorna `{ userPlanId, planId }`.
 */
export async function seedTier2ExpiredUserPlan(opts: {
  centerSlug: string;
  userEmail: string;
  planName: string;
}): Promise<{ userPlanId: string; planId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;

  const slug = opts.planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug } },
    update: {},
    create: {
      centerId: center.id,
      name: opts.planName,
      slug,
      description: "Plan E2E (expirado)",
      type: "LIVE",
      amountCents: 19900,
      currency: "CLP",
      maxReservations: 4,
      validityDays: 30,
      billingMode: "ONE_TIME",
    },
  });

  const validFrom = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const validUntil = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const userPlan = await prisma.userPlan.create({
    data: {
      userId: user.id,
      planId: plan.id,
      centerId: center.id,
      status: "EXPIRED",
      paymentStatus: "PAID",
      classesTotal: plan.maxReservations,
      classesUsed: 0,
      validFrom,
      validUntil,
    },
  });
  return { userPlanId: userPlan.id, planId: plan.id };
}

/** Borra un UserPlan por id. */
export async function cleanupTier2UserPlan(userPlanId: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  await prisma.reservation.deleteMany({ where: { userPlanId } }).catch(() => {});
  await prisma.userPlan.delete({ where: { id: userPlanId } }).catch(() => {});
}

/**
 * Crea un feriado para el centro. Idempotente por (centerId, date).
 * `dateYmd` formato `YYYY-MM-DD`.
 */
export async function seedTier2Holiday(opts: {
  centerSlug: string;
  dateYmd: string;
  label?: string;
}): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const [y, m, d] = opts.dateYmd.split("-").map((s) => parseInt(s, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  const h = await prisma.centerHoliday.upsert({
    where: { centerId_date: { centerId: center.id, date } },
    update: { label: opts.label ?? "Feriado E2E" },
    create: { centerId: center.id, date, label: opts.label ?? "Feriado E2E" },
  });
  return { id: h.id };
}

/** Borra holidays cuyo label matchea `labelPattern`. */
export async function cleanupTier2Holidays(labelPattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  await prisma.centerHoliday.deleteMany({
    where: { label: { contains: labelPattern } },
  }).catch(() => {});
}

/**
 * Snapshot completo del CenterSiteConfig, para restaurar en afterAll luego de
 * un test que muta colores/textos.
 */
export type SiteConfigSnapshot = {
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroEyebrow: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  heroImageUrl: string | null;
  heroOverlayEnabled: boolean;
};

export async function snapshotTier2SiteConfig(
  centerSlug: string,
): Promise<SiteConfigSnapshot | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: centerSlug } });
  if (!center) return null;
  const cfg = await prisma.centerSiteConfig.findUnique({ where: { centerId: center.id } });
  if (!cfg) return null;
  return {
    colorPrimary: cfg.colorPrimary,
    colorSecondary: cfg.colorSecondary,
    colorAccent: cfg.colorAccent,
    heroTitle: cfg.heroTitle,
    heroSubtitle: cfg.heroSubtitle,
    heroEyebrow: cfg.heroEyebrow,
    seoTitle: cfg.seoTitle,
    seoDescription: cfg.seoDescription,
    logoUrl: cfg.logoUrl,
    faviconUrl: cfg.faviconUrl,
    heroImageUrl: cfg.heroImageUrl,
    heroOverlayEnabled: cfg.heroOverlayEnabled,
  };
}

export async function restoreTier2SiteConfig(
  centerSlug: string,
  snap: SiteConfigSnapshot,
) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const center = await prisma.center.findUnique({ where: { slug: centerSlug } });
  if (!center) return;
  await prisma.centerSiteConfig.update({
    where: { centerId: center.id },
    data: { ...snap },
  }).catch(() => {});
}

/**
 * Crea una LiveClass con `acceptsTrialReservations=true` que cumple la ventana de
 * reserva (default: arranca en 48h, lejos del bookBeforeMinutes=1440).
 * Retorna `{ id }`.
 */
export async function seedTier2TrialClass(opts: {
  centerSlug: string;
  title: string;
  startsInHours?: number;
  trialCapacity?: number;
}): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const startsAt = new Date(Date.now() + (opts.startsInHours ?? 48) * 60 * 60 * 1000);
  const lc = await prisma.liveClass.create({
    data: {
      centerId: center.id,
      title: opts.title,
      startsAt,
      durationMinutes: 60,
      maxCapacity: 10,
      acceptsTrialReservations: true,
      trialCapacity: opts.trialCapacity ?? 10,
    },
  });
  return { id: lc.id };
}

/**
 * Crea una LiveClass dentro de la ventana de bloqueo (default: arranca en
 * 12h, dentro del bookBeforeMinutes=1440). Útil para verificar el bloqueo
 * por ventana cerrada. Retorna `{ id }`.
 */
export async function seedTier2ClassWithinBookingWindow(opts: {
  centerSlug: string;
  title: string;
  startsInHours?: number;
}): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const startsAt = new Date(Date.now() + (opts.startsInHours ?? 12) * 60 * 60 * 1000);
  const lc = await prisma.liveClass.create({
    data: {
      centerId: center.id,
      title: opts.title,
      startsAt,
      durationMinutes: 60,
      maxCapacity: 10,
    },
  });
  return { id: lc.id };
}

/**
 * Borra todas las reservas (cualquier estado) que un usuario tenga en el
 * centro. Útil antes de testear "trial limit" para empezar limpio.
 */
export async function cleanupTier2UserReservations(opts: {
  centerSlug: string;
  userEmail: string;
}) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return;
  await prisma.reservation.deleteMany({
    where: { userId: user.id, liveClass: { centerId: center.id } },
  }).catch(() => {});
}

/**
 * Borra todos los UserPlan que tenga un usuario en un centro. Útil para
 * arrancar "sin plan" en escenarios de trial/booking-window.
 */
export async function cleanupTier2UserPlansForUser(opts: {
  centerSlug: string;
  userEmail: string;
}) {
  const prisma = await getPrisma();
  if (!prisma) return;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return;
  const ups = await prisma.userPlan.findMany({
    where: { userId: user.id, centerId: center.id },
  });
  for (const up of ups) {
    await prisma.reservation.deleteMany({ where: { userPlanId: up.id } }).catch(() => {});
    await prisma.userPlan.delete({ where: { id: up.id } }).catch(() => {});
  }
}

/** Borra ManualPayment por nota. */
export async function cleanupTier2ManualPayments(notePattern: string) {
  const prisma = await getPrisma();
  if (!prisma) return;
  await prisma.manualPayment.deleteMany({
    where: { note: { contains: notePattern } },
  }).catch(() => {});
}

/**
 * Crea una LiveClass pasada + Reservation CONFIRMED para `userEmail`. Útil
 * para testear el flujo de no-show (mark NO_SHOW por admin/instructor).
 * Devuelve `{ liveClassId, reservationId }`.
 */
export async function seedTier2PastReservation(opts: {
  centerSlug: string;
  userEmail: string;
  title: string;
  hoursAgo?: number;
}): Promise<{ liveClassId: string; reservationId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const startsAt = new Date(Date.now() - (opts.hoursAgo ?? 2) * 60 * 60 * 1000);
  const lc = await prisma.liveClass.create({
    data: {
      centerId: center.id,
      title: opts.title,
      startsAt,
      durationMinutes: 60,
      maxCapacity: 10,
    },
  });
  const r = await prisma.reservation.create({
    data: {
      userId: user.id,
      liveClassId: lc.id,
      status: "CONFIRMED",
    },
  });
  return { liveClassId: lc.id, reservationId: r.id };
}

/**
 * Crea (idempotente) un usuario STUDENT dedicado para tests específicos.
 * Reusa email/password si ya existe. Devuelve `{ email, password, userId }`.
 */
export async function ensureTier2DedicatedStudent(opts: {
  centerSlug: string;
  email: string;
  password: string;
}): Promise<{ email: string; password: string; userId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const passwordHash = await hashE2EPassword(opts.password);
  const ensured = await ensureE2EUser({
    centerId: center.id,
    email: opts.email,
    passwordHash,
    name: "PvT Runner E2E",
    role: "STUDENT",
    rotateOnExisting: true,
  });
  if (!ensured) return null;
  return { email: opts.email, password: opts.password, userId: ensured.id };
}

/**
 * Borra todas las reservas del usuario en las clases dadas. Más quirúrgico
 * que `cleanupTier2UserReservations` para evitar colisiones entre specs que
 * comparten admin@e2e.test.
 */
export async function cleanupTier2UserReservationsOnClasses(opts: {
  userEmail: string;
  liveClassIds: string[];
}) {
  const prisma = await getPrisma();
  if (!prisma || opts.liveClassIds.length === 0) return;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return;
  await prisma.reservation
    .deleteMany({ where: { userId: user.id, liveClassId: { in: opts.liveClassIds } } })
    .catch(() => {});
}

/**
 * Toggle `allowTrialClassPerPerson` del centro. Devuelve el valor previo
 * para restaurarlo en afterAll.
 */
export async function setTier2CenterAllowTrial(opts: {
  centerSlug: string;
  allow: boolean;
}): Promise<{ previous: boolean } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const previous = center.allowTrialClassPerPerson;
  await prisma.center.update({
    where: { id: center.id },
    data: { allowTrialClassPerPerson: opts.allow },
  });
  return { previous };
}

/**
 * Asigna un UserPlan ACTIVE de tipo ON_DEMAND a un usuario existente.
 * Útil para verificar que ON_DEMAND no satisface la elegibilidad de clases
 * en vivo (LIVE). Devuelve el id del userPlan creado.
 */
export async function seedTier2OnDemandUserPlanForExistingUser(opts: {
  centerSlug: string;
  userEmail: string;
  planName?: string;
}): Promise<{ userId: string; userPlanId: string; planId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;

  const planName = opts.planName ?? `OnDemand E2E ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const planSlug = planName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const plan = await prisma.plan.upsert({
    where: { centerId_slug: { centerId: center.id, slug: planSlug } },
    create: {
      centerId: center.id,
      name: planName,
      slug: planSlug,
      description: "Plan ON_DEMAND E2E",
      type: "ON_DEMAND",
      amountCents: 9900,
      currency: "CLP",
      validityDays: 30,
      billingMode: "ONE_TIME",
    },
    update: {},
  });
  const up = await prisma.userPlan.create({
    data: {
      userId: user.id,
      planId: plan.id,
      centerId: center.id,
      status: "ACTIVE",
      paymentStatus: "PAID",
      classesTotal: null,
      classesUsed: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return { userId: user.id, userPlanId: up.id, planId: plan.id };
}

/**
 * Marca o desmarca la membresía (UserCenterRole) de un usuario como
 * `isLegacyClient`. Devuelve el valor previo para restaurarlo en afterAll.
 */
export async function setTier2UserLegacyClient(opts: {
  centerSlug: string;
  userEmail: string;
  isLegacyClient: boolean;
}): Promise<{ previous: boolean } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const membership = await prisma.userCenterRole.findUnique({
    where: { userId_centerId: { userId: user.id, centerId: center.id } },
    select: { isLegacyClient: true },
  });
  if (!membership) return null;
  await prisma.userCenterRole.update({
    where: { userId_centerId: { userId: user.id, centerId: center.id } },
    data: { isLegacyClient: opts.isLegacyClient },
  });
  return { previous: membership.isLegacyClient };
}

/** Cuenta reservas NO_SHOW de un user en un centro en el mes corriente. */
export async function countTier2NoShowsThisMonth(opts: {
  centerSlug: string;
  userEmail: string;
}): Promise<number | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return prisma.reservation.count({
    where: {
      userId: user.id,
      status: "NO_SHOW",
      liveClass: { centerId: center.id },
      updatedAt: { gte: startOfMonth },
    },
  });
}

/**
 * Crea una WaitlistEntry para un user/item de manera directa (sin pasar por
 * el use case). Útil para tests de concurrencia: necesitamos N entries
 * pre-existentes para racer los promotes.
 */
export async function seedTier1WaitlistEntry(opts: {
  centerSlug: string;
  userId: string;
  kind: "class" | "event";
  itemId: string;
}): Promise<{ entryId: string; position: number } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  const itemFilter =
    opts.kind === "class" ? { liveClassId: opts.itemId } : { eventId: opts.itemId };
  const count = await prisma.waitlistEntry.count({ where: itemFilter });
  const entry = await prisma.waitlistEntry.create({
    data: {
      userId: opts.userId,
      centerId: center.id,
      liveClassId: opts.kind === "class" ? opts.itemId : null,
      eventId: opts.kind === "event" ? opts.itemId : null,
      status: "QUEUED",
      position: count + 1,
    },
  });
  return { entryId: entry.id, position: entry.position };
}

export async function cleanupTier1WaitlistEntries(entryIds: string[]): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma || entryIds.length === 0) return;
  await prisma.waitlistEntry.deleteMany({ where: { id: { in: entryIds } } });
}

/**
 * Seed multi-tenant isolation fixtures: un centro "extranjero" con un set
 * mínimo de recursos. El admin de e2e-test NO debería poder mutar nada de acá.
 * Devuelve los IDs para los asserts; null si no hay DB.
 */
export async function seedForeignCenterFixtures(): Promise<{
  centerId: string;
  siteSectionId: string;
  siteSectionItemId: string;
  aboutImageId: string;
  categoryId: string;
  practiceId: string;
  lessonId: string;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;

  const slug = "e2e-foreign";
  const center = await prisma.center.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: "Foreign E2E",
      timezone: "America/Santiago",
      currency: "CLP",
    },
  });

  const section = await prisma.centerSiteSection.create({
    data: {
      centerId: center.id,
      sectionKey: "hero",
      title: "Foreign section",
      sortOrder: 0,
      visible: true,
    },
  });
  const sectionItem = await prisma.centerSiteSectionItem.create({
    data: { sectionId: section.id, title: "foreign item", sortOrder: 0 },
  });

  const aboutPage = await prisma.centerAboutPage.upsert({
    where: { centerId: center.id },
    update: {},
    create: { centerId: center.id, pageTitle: "Sobre el centro extranjero" },
  });
  const aboutImage = await prisma.centerAboutPageImage.create({
    data: {
      pageId: aboutPage.id,
      imageUrl: "https://example.test/foreign.jpg",
      caption: "foreign",
      category: "RETIROS",
      sortOrder: 0,
      visible: true,
    },
  });

  const category = await prisma.onDemandCategory.create({
    data: {
      centerId: center.id,
      name: "Foreign category",
      sortOrder: 0,
      status: "PUBLISHED",
    },
  });
  const practice = await prisma.onDemandPractice.create({
    data: {
      categoryId: category.id,
      name: "Foreign practice",
      sortOrder: 0,
      status: "PUBLISHED",
    },
  });
  const lesson = await prisma.onDemandLesson.create({
    data: {
      practiceId: practice.id,
      title: "Foreign lesson",
      videoUrl: "https://example.test/foreign.mp4",
      sortOrder: 0,
      status: "PUBLISHED",
    },
  });

  return {
    centerId: center.id,
    siteSectionId: section.id,
    siteSectionItemId: sectionItem.id,
    aboutImageId: aboutImage.id,
    categoryId: category.id,
    practiceId: practice.id,
    lessonId: lesson.id,
  };
}

export async function cleanupForeignCenterFixtures(): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;
  const center = await prisma.center.findUnique({ where: { slug: "e2e-foreign" } });
  if (!center) return;
  // Las relaciones cascadean: borrar el Center remueve sections, about-page (+ imágenes),
  // categories (+ practices + lessons), etc.
  await prisma.center.delete({ where: { id: center.id } }).catch(() => {});
}

/** Verifica que un recurso siga existiendo (para asserts de "no se borró"). */
export async function foreignResourceExists(
  kind: "siteSection" | "siteSectionItem" | "aboutImage" | "category" | "practice" | "lesson",
  id: string,
): Promise<boolean> {
  const prisma = await getPrisma();
  if (!prisma) return false;
  switch (kind) {
    case "siteSection":
      return !!(await prisma.centerSiteSection.findUnique({ where: { id } }));
    case "siteSectionItem":
      return !!(await prisma.centerSiteSectionItem.findUnique({ where: { id } }));
    case "aboutImage":
      return !!(await prisma.centerAboutPageImage.findUnique({ where: { id } }));
    case "category":
      return !!(await prisma.onDemandCategory.findUnique({ where: { id } }));
    case "practice":
      return !!(await prisma.onDemandPractice.findUnique({ where: { id } }));
    case "lesson":
      return !!(await prisma.onDemandLesson.findUnique({ where: { id } }));
  }
}

/**
 * Lee `Reservation.status` desde la DB. Útil para verificar persistencia de
 * `markAttendanceUseCase` en specs de E2E.
 */
export async function getTier2ReservationStatus(
  reservationId: string,
): Promise<string | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { status: true },
  });
  return r?.status ?? null;
}

/**
 * Crea LiveClass pasada + Reservation CONFIRMED en el centro "e2e-foreign".
 * Asume `seedForeignCenterFixtures()` ya creó el centro. Usa al usuario
 * `userEmail` (que vive en `e2e-test`) como dueño de la reserva — es válido
 * porque User es global; solo el centerId de la clase importa para attendance.
 *
 * Útil para defense-in-depth: admin/instructor de centro A intenta marcar
 * asistencia de una reserva cuya LiveClass pertenece al centro B.
 */
export async function seedForeignCenterPastReservation(opts: {
  userEmail: string;
  title: string;
  hoursAgo?: number;
}): Promise<{ liveClassId: string; reservationId: string } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: "e2e-foreign" } });
  if (!center) return null;
  const user = await prisma.user.findUnique({ where: { email: opts.userEmail } });
  if (!user) return null;
  const startsAt = new Date(Date.now() - (opts.hoursAgo ?? 2) * 60 * 60 * 1000);
  const lc = await prisma.liveClass.create({
    data: {
      centerId: center.id,
      title: opts.title,
      startsAt,
      durationMinutes: 60,
      maxCapacity: 10,
    },
  });
  const r = await prisma.reservation.create({
    data: {
      userId: user.id,
      liveClassId: lc.id,
      status: "CONFIRMED",
    },
  });
  return { liveClassId: lc.id, reservationId: r.id };
}

/**
 * Crea N usuarios STUDENT con emails `{prefix}{NN}@e2e.test` y names
 * `{nameLabel} {NN}` (padded a 2 dígitos). Idempotente. Útil para tests de
 * listas paginadas / búsqueda. Cleanup vía `cleanupTier1UsersByEmailPrefix`.
 */
export async function seedBulkStudents(opts: {
  centerSlug: string;
  emailPrefix: string;
  nameLabel: string;
  count: number;
}): Promise<{ created: number } | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;
  // Hasheamos una vez fuera del loop (bcrypt ~100ms * N sería desperdicio).
  const passwordHash = await hashE2EPassword("bulk-students-e2e");
  let created = 0;
  for (let i = 1; i <= opts.count; i++) {
    const padded = String(i).padStart(2, "0");
    const email = `${opts.emailPrefix}${padded}@e2e.test`;
    const name = `${opts.nameLabel} ${padded}`;
    const ensured = await ensureE2EUser({
      centerId: center.id,
      email,
      passwordHash,
      name,
      role: "STUDENT",
    });
    if (ensured) created++;
  }
  return { created };
}

/**
 * Crea una LiveClassSeries WEEKLY + N LiveClass instancias asociadas para
 * tests CRUD de horarios. Las instancias se crean directamente vía Prisma
 * (no via generateSeriesInstances) para tener control exacto de cantidades
 * y fechas independiente del generador.
 *
 * Default: arranca en `offsetDays` días (7 por default) a las 10:00 local
 * del runner, repite todas las semanas el mismo día.
 */
export async function seedHorarioWeeklySeries(opts: {
  centerSlug: string;
  count: number;
  titlePrefix: string;
  offsetDays?: number;
}): Promise<{
  seriesId: string;
  title: string;
  instances: Array<{ id: string; startsAt: Date }>;
} | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const center = await prisma.center.findUnique({ where: { slug: opts.centerSlug } });
  if (!center) return null;

  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const title = `${opts.titlePrefix} ${runId}`;
  const baseStart = new Date(Date.now() + (opts.offsetDays ?? 7) * 86400000);
  baseStart.setHours(10, 0, 0, 0);

  const series = await prisma.liveClassSeries.create({
    data: {
      centerId: center.id,
      title,
      durationMinutes: 60,
      maxCapacity: 10,
      isOnline: false,
      acceptsTrialReservations: false,
      classPassEnabled: false,
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [baseStart.getUTCDay()],
      repeatEveryN: 1,
      startsAt: baseStart,
      // endsAt = startsAt de la última instancia (no la semana posterior),
      // así thisAndFollowing no regenera una instancia "extra" después
      // de la última seedeada.
      endsAt: new Date(baseStart.getTime() + (opts.count - 1) * 7 * 86400000),
      monthlyMode: null,
    },
  });

  const instances: Array<{ id: string; startsAt: Date }> = [];
  for (let i = 0; i < opts.count; i++) {
    const startsAt = new Date(baseStart.getTime() + i * 7 * 86400000);
    const cls = await prisma.liveClass.create({
      data: {
        centerId: center.id,
        seriesId: series.id,
        title,
        startsAt,
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });
    instances.push({ id: cls.id, startsAt: cls.startsAt });
  }
  return { seriesId: series.id, title, instances };
}

/**
 * Borra LiveClass + LiveClassSeries (y reservas dependientes) cuyo título
 * empiece con `prefix`. Útil como red de seguridad en afterAll.
 */
export async function cleanupHorariosByTitlePrefix(prefix: string): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;

  const classes = await prisma.liveClass.findMany({
    where: { title: { startsWith: prefix } },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);
  if (classIds.length > 0) {
    await prisma.reservation
      .deleteMany({ where: { liveClassId: { in: classIds } } })
      .catch(() => {});
    await prisma.liveClass
      .deleteMany({ where: { id: { in: classIds } } })
      .catch(() => {});
  }

  const series = await prisma.liveClassSeries.findMany({
    where: { title: { startsWith: prefix } },
    select: { id: true },
  });
  const seriesIds = series.map((s) => s.id);
  if (seriesIds.length > 0) {
    // Por si quedaron instancias huérfanas que no matchean el prefijo
    // (ej. updates de título que no usan el mismo prefijo).
    const orphans = await prisma.liveClass.findMany({
      where: { seriesId: { in: seriesIds } },
      select: { id: true },
    });
    const orphanIds = orphans.map((c) => c.id);
    if (orphanIds.length > 0) {
      await prisma.reservation
        .deleteMany({ where: { liveClassId: { in: orphanIds } } })
        .catch(() => {});
      await prisma.liveClass
        .deleteMany({ where: { id: { in: orphanIds } } })
        .catch(() => {});
    }
    await prisma.liveClassSeries
      .deleteMany({ where: { id: { in: seriesIds } } })
      .catch(() => {});
  }
}
