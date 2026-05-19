/**
 * Script de setup para verificar manualmente el fix de trial-precheck.
 * Solo opera sobre el centro e2e-test. Es idempotente.
 *
 * Modo controlado por arg --no-plan:
 *  - sin flag: estado student con plan LIVE activo + legacy + trial class
 *  - con flag --no-plan: cancela planes LIVE del student (mantiene legacy + trial class)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no definida");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dropPlan = process.argv.includes("--no-plan");
  const noLegacy = process.argv.includes("--no-legacy");
  const hardReset = process.argv.includes("--hard-reset");
  const center = await prisma.center.findUnique({ where: { slug: "e2e-test" } });
  if (!center) throw new Error("Centro e2e-test no existe; corre `npm run db:seed` primero");

  await prisma.center.update({
    where: { id: center.id },
    data: { allowTrialClassPerPerson: true },
  });

  const studentEmail = process.env.SEED_STUDENT_EMAIL ?? "student@e2e.test";
  const student = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!student) throw new Error(`Student ${studentEmail} no existe`);

  await prisma.userCenterRole.updateMany({
    where: { userId: student.id, centerId: center.id },
    data: { isLegacyClient: !noLegacy },
  });

  if (hardReset) {
    const del = await prisma.reservation.deleteMany({
      where: { userId: student.id, liveClass: { centerId: center.id } },
    });
    console.log(`Reservas borradas (hard reset): ${del.count}`);
  }

  if (dropPlan) {
    const updated = await prisma.userPlan.updateMany({
      where: { userId: student.id, centerId: center.id, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    console.log(`Planes ACTIVE → CANCELLED para student e2e: ${updated.count}`);

    // También limpiamos cualquier reserva CONFIRMED previa para que el server
    // no la bloquee con ALREADY_RESERVED.
    const center2 = center;
    const trials = await prisma.liveClass.findMany({
      where: { centerId: center2.id, acceptsTrialReservations: true, startsAt: { gte: new Date() } },
    });
    for (const t of trials) {
      const reservation = await prisma.reservation.findFirst({
        where: { userId: student.id, liveClassId: t.id, status: "CONFIRMED" },
      });
      if (reservation) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: "CANCELLED" },
        });
        console.log(`Reserva previa cancelada: ${reservation.id}`);
      }
    }
  } else {
    // Asegurar plan LIVE activo
    const livePlan = await prisma.plan.findFirst({
      where: { centerId: center.id, type: "LIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (livePlan) {
      const existing = await prisma.userPlan.findFirst({
        where: { userId: student.id, centerId: center.id, planId: livePlan.id, status: "ACTIVE" },
      });
      if (!existing) {
        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 31);
        await prisma.userPlan.create({
          data: {
            userId: student.id,
            centerId: center.id,
            planId: livePlan.id,
            status: "ACTIVE",
            paymentStatus: "PAID",
            classesTotal: livePlan.maxReservations ?? 6,
            classesUsed: 0,
            validFrom,
            validUntil,
          },
        });
        console.log("Plan LIVE ACTIVE creado para student e2e");
      } else {
        console.log("Student e2e ya tiene plan LIVE activo");
      }
    }

    // Cancelar trials previos para no bloquearse con ALREADY_RESERVED.
    const trials = await prisma.liveClass.findMany({
      where: { centerId: center.id, acceptsTrialReservations: true, startsAt: { gte: new Date() } },
    });
    for (const t of trials) {
      const r = await prisma.reservation.findFirst({
        where: { userId: student.id, liveClassId: t.id, status: "CONFIRMED" },
      });
      if (r) await prisma.reservation.update({ where: { id: r.id }, data: { status: "CANCELLED" } });
    }
  }

  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  inThreeDays.setHours(11, 0, 0, 0);

  const existingTrial = await prisma.liveClass.findFirst({
    where: { centerId: center.id, acceptsTrialReservations: true, startsAt: { gte: new Date() } },
  });
  if (!existingTrial) {
    await prisma.liveClass.create({
      data: {
        centerId: center.id,
        title: "Clase Trial Test",
        startsAt: inThreeDays,
        durationMinutes: 60,
        maxCapacity: 10,
        acceptsTrialReservations: true,
      },
    });
    console.log("Trial class creada en e2e-test");
  } else {
    console.log("Trial class ya existe en e2e-test:", existingTrial.id);
  }

  const inFourDays = new Date();
  inFourDays.setDate(inFourDays.getDate() + 4);
  inFourDays.setHours(11, 0, 0, 0);
  const existingNormal = await prisma.liveClass.findFirst({
    where: { centerId: center.id, acceptsTrialReservations: false, title: "Clase Normal Test", startsAt: { gte: new Date() } },
  });
  if (!existingNormal) {
    await prisma.liveClass.create({
      data: {
        centerId: center.id,
        title: "Clase Normal Test",
        startsAt: inFourDays,
        durationMinutes: 60,
        maxCapacity: 10,
        acceptsTrialReservations: false,
      },
    });
    console.log("Normal class creada en e2e-test");
  } else {
    console.log("Normal class ya existe:", existingNormal.id);
  }

  console.log("Setup completo. dropPlan=", dropPlan);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
