import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const EXTERNAL_REF = "evt_623b0283-124c-4b8c-93e3-a3aa4b20e5e2";
const MP_PAYMENT_ID = "159192764346";
const EVENT_ID = "cmp1hfzq5000004jos9hhu3qy";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const byExtRef = await prisma.eventTicket.findMany({
    where: { externalReference: EXTERNAL_REF },
    include: { user: { select: { email: true, name: true } }, event: { select: { title: true } } },
  });
  console.log("EventTicket by externalReference:");
  console.log(JSON.stringify(byExtRef, null, 2));

  const byPayment = await prisma.eventTicket.findMany({
    where: { mpPaymentId: MP_PAYMENT_ID },
    include: { user: { select: { email: true, name: true } }, event: { select: { title: true } } },
  });
  console.log("\nEventTicket by mpPaymentId:");
  console.log(JSON.stringify(byPayment, null, 2));

  const event = await prisma.event.findUnique({
    where: { id: EVENT_ID },
    select: { id: true, title: true, maxCapacity: true, _count: { select: { tickets: true } } },
  });
  console.log("\nEvent:", event);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
