import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const center = await prisma.center.upsert({
    where: { slug: "cuerporaiz" },
    create: { name: "Cuerpo Raíz", slug: "cuerporaiz" },
    update: {},
  });

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@cuerporaiz.cl";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: hash,
      name: "Administrator",
    },
    update: {},
  });

  await prisma.userCenterRole.upsert({
    where: {
      userId_centerId: { userId: user.id, centerId: center.id },
    },
    create: {
      userId: user.id,
      centerId: center.id,
      role: "ADMINISTRATOR",
    },
    update: {},
  });

  // Usuario Student fijo para E2E (credenciales estables)
  const studentEmail = process.env.SEED_STUDENT_EMAIL ?? "student@cuerporaiz.cl";
  const studentPassword = process.env.SEED_STUDENT_PASSWORD ?? "student123";
  const studentHash = await bcrypt.hash(studentPassword, 12);
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    create: {
      email: studentEmail,
      passwordHash: studentHash,
      name: "Student E2E",
    },
    update: {},
  });
  await prisma.userCenterRole.upsert({
    where: {
      userId_centerId: { userId: student.id, centerId: center.id },
    },
    create: {
      userId: student.id,
      centerId: center.id,
      role: "STUDENT",
    },
    update: { role: "STUDENT" },
  });

  // Clases live de ejemplo para reservas (solo si no hay ninguna)
  const existingClass = await prisma.liveClass.findFirst({ where: { centerId: center.id } });
  if (!existingClass) {
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    inTwoDays.setHours(10, 0, 0, 0);
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    inThreeDays.setHours(18, 0, 0, 0);
    await prisma.liveClass.createMany({
      data: [
        {
          centerId: center.id,
          title: "Vinyasa Flow",
          startsAt: inTwoDays,
          durationMinutes: 60,
          maxCapacity: 10,
        },
        {
          centerId: center.id,
          title: "Yin Yoga",
          startsAt: inThreeDays,
          durationMinutes: 75,
          maxCapacity: 8,
        },
      ],
    });
  }
  // Asegurar al menos 1 clase futura "reservable" (lejos de ventanas de bloqueo).
  const now = new Date();
  // bookBeforeMinutes default = 24h → dejamos margen (48h) para evitar flakiness.
  const minReservable = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const hasFutureReservable = await prisma.liveClass.findFirst({
    where: {
      centerId: center.id,
      startsAt: { gte: minReservable },
    },
  });
  if (!hasFutureReservable) {
    const startsAt = new Date(minReservable);
    await prisma.liveClass.create({
      data: {
        centerId: center.id,
        title: "Clase E2E (futura)",
        startsAt,
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });
    console.log("Clase futura creada para E2E");
  }

  console.log("Seed OK: center", center.slug, "user", user.email, "role ADMINISTRATOR");

  const existingConfig = await prisma.centerMercadoPagoConfig.findUnique({
    where: { centerId: center.id },
  });
  if (!existingConfig) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "TEST-xxx";
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "whsec-xxx";
    await prisma.centerMercadoPagoConfig.create({
      data: {
        centerId: center.id,
        accessToken,
        webhookSecret,
        enabled: true,
      },
    });
    console.log("MercadoPago config creada (usa MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_WEBHOOK_SECRET en .env para producción)");
  }

  const existingPlan = await prisma.plan.findFirst({ where: { centerId: center.id } });
  if (!existingPlan) {
    await prisma.plan.createMany({
      data: [
        {
          centerId: center.id,
          name: "Pack 6 clases",
          slug: "pack-6",
          description: "6 clases presenciales u online, 31 días de vigencia",
          amountCents: 48000,
          currency: "CLP",
          type: "LIVE",
          validityDays: 31,
          maxReservations: 6,
          billingMode: "ONE_TIME",
        },
        {
          centerId: center.id,
          name: "Membresía mensual",
          slug: "membresia-mensual",
          description: "Acceso ilimitado a videoteca on-demand",
          amountCents: 15000,
          currency: "CLP",
          type: "MEMBERSHIP_ON_DEMAND",
          validityPeriod: "MONTHLY",
          billingMode: "RECURRING",
          recurringDiscountPercent: 10,
        },
      ],
    });
    console.log("Planes de ejemplo creados (Live 6 clases, Membresía mensual)");
  }

  // Plan activo usable para student (necesario para reservar clases LIVE)
  const livePlan = await prisma.plan.findFirst({
    where: { centerId: center.id, type: "LIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (livePlan) {
    const existingUserPlan = await prisma.userPlan.findFirst({
      where: { userId: student.id, centerId: center.id, planId: livePlan.id, status: "ACTIVE" },
    });
    if (!existingUserPlan) {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 31);
      await prisma.userPlan.create({
        data: {
          userId: student.id,
          centerId: center.id,
          planId: livePlan.id,
          orderId: null,
          status: "ACTIVE",
          paymentStatus: "PAID",
          classesTotal: livePlan.maxReservations ?? 6,
          classesUsed: 0,
          validFrom,
          validUntil,
        },
      });
      console.log("UserPlan ACTIVE creado para student e2e:", student.email);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
