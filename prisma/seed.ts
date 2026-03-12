import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma";
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
          description: "6 clases presenciales, 31 días de vigencia",
          amountCents: 48000,
          currency: "CLP",
          type: "PACK",
        },
        {
          centerId: center.id,
          name: "Membresía mensual",
          slug: "membresia-mensual",
          description: "Acceso a contenido online y clases",
          amountCents: 15000,
          currency: "CLP",
          type: "MEMBERSHIP",
        },
      ],
    });
    console.log("Planes de ejemplo creados (Pack 6, Membresía mensual)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
