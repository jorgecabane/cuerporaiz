/**
 * Setup local para probar el flujo completo de eventos en el centro e2e-test.
 * Crea (o reusa) 2 eventos PUBLISHED — uno gratis y uno pagado — y limpia los
 * tickets previos del student de e2e para empezar desde cero.
 *
 * Uso:
 *   tsx prisma/scripts/setup-events-test.ts
 *   tsx prisma/scripts/setup-events-test.ts --clean   # también borra tickets
 *
 * Imprime IDs y URLs que se pueden abrir directo en el navegador.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no definida");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const FREE_TITLE = "E2E Manual Evento FREE";
const PAID_TITLE = "E2E Manual Evento PAGADO";
const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? "student@e2e.test";

async function main() {
  const clean = process.argv.includes("--clean");

  const center = await prisma.center.findUnique({ where: { slug: "e2e-test" } });
  if (!center) throw new Error("Centro e2e-test no existe; corre `npm run db:seed`");

  const student = await prisma.user.findUnique({ where: { email: STUDENT_EMAIL } });
  if (!student) throw new Error(`Student ${STUDENT_EMAIL} no existe; corre seed`);

  // Crear o reusar el evento FREE (mañana 10:00).
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);

  let freeEvent = await prisma.event.findFirst({
    where: { centerId: center.id, title: FREE_TITLE },
  });
  if (!freeEvent) {
    freeEvent = await prisma.event.create({
      data: {
        centerId: center.id,
        title: FREE_TITLE,
        description: "Evento gratis para validar flow local.",
        location: "Sala E2E",
        startsAt: start,
        endsAt: end,
        amountCents: 0,
        currency: "CLP",
        maxCapacity: 20,
        status: "PUBLISHED",
      },
    });
    console.log("✔ Creado evento FREE:", freeEvent.id);
  } else {
    // Refrescar fecha por si quedó en el pasado.
    if (freeEvent.startsAt < new Date()) {
      freeEvent = await prisma.event.update({
        where: { id: freeEvent.id },
        data: { startsAt: start, endsAt: end, status: "PUBLISHED" },
      });
      console.log("↻ Actualizado evento FREE:", freeEvent.id);
    } else {
      console.log("• Reusando evento FREE:", freeEvent.id);
    }
  }

  // Crear o reusar el evento PAGADO (mañana 15:00).
  const paidStart = new Date(start);
  paidStart.setHours(15, 0, 0, 0);
  const paidEnd = new Date(paidStart);
  paidEnd.setHours(17, 0, 0, 0);

  let paidEvent = await prisma.event.findFirst({
    where: { centerId: center.id, title: PAID_TITLE },
  });
  if (!paidEvent) {
    paidEvent = await prisma.event.create({
      data: {
        centerId: center.id,
        title: PAID_TITLE,
        description: "Evento pagado para validar webhook MP localmente.",
        location: "Sala E2E",
        startsAt: paidStart,
        endsAt: paidEnd,
        amountCents: 15000,
        currency: "CLP",
        maxCapacity: 20,
        status: "PUBLISHED",
      },
    });
    console.log("✔ Creado evento PAGADO:", paidEvent.id);
  } else {
    if (paidEvent.startsAt < new Date()) {
      paidEvent = await prisma.event.update({
        where: { id: paidEvent.id },
        data: { startsAt: paidStart, endsAt: paidEnd, status: "PUBLISHED" },
      });
      console.log("↻ Actualizado evento PAGADO:", paidEvent.id);
    } else {
      console.log("• Reusando evento PAGADO:", paidEvent.id);
    }
  }

  // Limpiar tickets previos del student sobre estos eventos (opt-in).
  if (clean) {
    const del = await prisma.eventTicket.deleteMany({
      where: {
        userId: student.id,
        eventId: { in: [freeEvent.id, paidEvent.id] },
      },
    });
    console.log(`✔ Tickets borrados del student e2e: ${del.count}`);
  }

  // Asegurar plugin MP habilitado en el centro (para que el endpoint NO
  // devuelva MP_NOT_CONFIGURED — la preferencia fallará igual porque las
  // credenciales son test, pero al menos el código llega a llamar a MP).
  const mp = await prisma.centerMercadoPagoConfig.findUnique({ where: { centerId: center.id } });
  if (!mp) {
    await prisma.centerMercadoPagoConfig.create({
      data: {
        centerId: center.id,
        accessToken: "TEST-FAKE-ACCESS-TOKEN-FOR-LOCAL",
        enabled: true,
      },
    });
    console.log("✔ MP config creada (fake) en el centro e2e-test");
  } else if (!mp.enabled) {
    await prisma.centerMercadoPagoConfig.update({
      where: { centerId: center.id },
      data: { enabled: true },
    });
    console.log("↻ MP config habilitada en el centro e2e-test");
  } else {
    console.log("• MP config ya habilitada");
  }

  console.log("\nResumen:");
  console.log("  Student:  ", student.email, `(id ${student.id})`);
  console.log("  Free:     ", `http://localhost:3000/panel/eventos/${freeEvent.id}`);
  console.log("  Pagado:   ", `http://localhost:3000/panel/eventos/${paidEvent.id}`);
  console.log("  Listado:  ", "http://localhost:3000/panel/eventos");
  console.log("  Mis pagos:", "http://localhost:3000/panel/mis-pagos");
  console.log("  Home:     ", "http://localhost:3000/panel");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
