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

  // ─── On Demand seed content ────────────────────────────────────────────────
  const existingOnDemandCategory = await prisma.onDemandCategory.findFirst({
    where: { centerId: center.id },
  });
  if (!existingOnDemandCategory) {
    const catYoga = await prisma.onDemandCategory.create({
      data: { centerId: center.id, name: "Yoga", description: "Clases grabadas de diferentes estilos de yoga", sortOrder: 0, status: "PUBLISHED" },
    });
    const catMeditacion = await prisma.onDemandCategory.create({
      data: { centerId: center.id, name: "Meditación", description: "Prácticas de meditación y mindfulness", sortOrder: 1, status: "PUBLISHED" },
    });

    const pracHatha = await prisma.onDemandPractice.create({ data: { categoryId: catYoga.id, name: "Hatha Yoga", sortOrder: 0, status: "PUBLISHED" } });
    const pracVinyasa = await prisma.onDemandPractice.create({ data: { categoryId: catYoga.id, name: "Vinyasa Flow", sortOrder: 1, status: "PUBLISHED" } });
    const pracRestaurativo = await prisma.onDemandPractice.create({ data: { categoryId: catYoga.id, name: "Yoga Restaurativo", sortOrder: 2, status: "PUBLISHED" } });
    const pracMindfulness = await prisma.onDemandPractice.create({ data: { categoryId: catMeditacion.id, name: "Mindfulness", sortOrder: 0, status: "PUBLISHED" } });
    const pracGuiada = await prisma.onDemandPractice.create({ data: { categoryId: catMeditacion.id, name: "Meditación Guiada", sortOrder: 1, status: "PUBLISHED" } });

    const lessons = [
      { practiceId: pracHatha.id, title: "Hatha para principiantes", durationMinutes: 30, level: "Principiante", intensity: "Suave", equipment: "Mat" },
      { practiceId: pracHatha.id, title: "Hatha intermedio — Fuerza", durationMinutes: 45, level: "Intermedio", intensity: "Moderada", equipment: "Mat, bloque" },
      { practiceId: pracHatha.id, title: "Hatha avanzado — Inversiones", durationMinutes: 60, level: "Avanzado", intensity: "Intensa", equipment: "Mat, cinta, bloque" },
      { practiceId: pracVinyasa.id, title: "Vinyasa matinal energizante", durationMinutes: 40, level: "Intermedio", intensity: "Moderada", equipment: "Mat" },
      { practiceId: pracVinyasa.id, title: "Vinyasa suave para la noche", durationMinutes: 35, level: "Principiante", intensity: "Suave", equipment: "Mat" },
      { practiceId: pracRestaurativo.id, title: "Restaurativo para estrés", durationMinutes: 50, level: "Principiante", intensity: "Suave", equipment: "Mat, bolster, manta" },
      { practiceId: pracRestaurativo.id, title: "Restaurativo para espalda", durationMinutes: 40, level: "Principiante", intensity: "Suave", equipment: "Mat, bloque, cinta" },
      { practiceId: pracMindfulness.id, title: "Mindfulness — Respiración consciente", durationMinutes: 15, level: "Principiante", intensity: "Suave" },
      { practiceId: pracMindfulness.id, title: "Body scan guiado", durationMinutes: 20, level: "Principiante", intensity: "Suave" },
      { practiceId: pracGuiada.id, title: "Meditación para dormir", durationMinutes: 25, level: "Principiante", intensity: "Suave" },
      { practiceId: pracGuiada.id, title: "Visualización creativa", durationMinutes: 20, level: "Intermedio", intensity: "Suave" },
    ];

    for (let i = 0; i < lessons.length; i++) {
      await prisma.onDemandLesson.create({
        data: { ...lessons[i], videoUrl: `https://player.vimeo.com/video/${900000000 + i}`, sortOrder: i % 3, status: "PUBLISHED" },
      });
    }

    console.log("Contenido on demand creado (2 categorías, 5 prácticas, 11 lecciones)");
  }

  // ON_DEMAND plan + quotas (independiente de las categorías)
  const allOdCategories = await prisma.onDemandCategory.findMany({ where: { centerId: center.id } });
  let odPlan = await prisma.plan.findFirst({ where: { centerId: center.id, type: "ON_DEMAND" } });
  if (!odPlan && allOdCategories.length > 0) {
    odPlan = await prisma.plan.create({
      data: { centerId: center.id, name: "Pack On Demand 6", slug: "on-demand-6", description: "6 clases on demand a desbloquear", amountCents: 12000, currency: "CLP", type: "ON_DEMAND", validityDays: 31, billingMode: "ONE_TIME" },
    });
    console.log("Plan ON_DEMAND creado:", odPlan.name);
  }

  // Ensure quotas exist for every ON_DEMAND plan + category
  if (odPlan && allOdCategories.length > 0) {
    const existingQuotas = await prisma.planCategoryQuota.findMany({ where: { planId: odPlan.id } });
    if (existingQuotas.length === 0) {
      const defaultQuotas: Record<string, number> = { "Yoga": 4, "Meditación": 2 };
      await prisma.planCategoryQuota.createMany({
        data: allOdCategories.map((cat) => ({
          planId: odPlan!.id,
          categoryId: cat.id,
          maxLessons: defaultQuotas[cat.name] ?? 2,
        })),
      });
      console.log("Quotas ON_DEMAND creadas para", allOdCategories.length, "categorías");
    }
  }

  // Activate ON_DEMAND plan for student
  if (odPlan) {
    const existingUp = await prisma.userPlan.findFirst({ where: { userId: student.id, centerId: center.id, planId: odPlan.id, status: "ACTIVE" } });
    if (!existingUp) {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 31);
      await prisma.userPlan.create({
        data: { userId: student.id, centerId: center.id, planId: odPlan.id, status: "ACTIVE", paymentStatus: "PAID", classesTotal: null, classesUsed: 0, validFrom, validUntil },
      });
      console.log("UserPlan ON_DEMAND ACTIVE creado para student e2e");
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
