import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

(async () => {
  const tickets = await prisma.eventTicket.findMany({
    where: { user: { email: "student@e2e.test" }, event: { title: { contains: "E2E Manual" } } },
    include: { event: { select: { title: true, amountCents: true } } },
    orderBy: { createdAt: "asc" },
  });
  for (const t of tickets) {
    console.log({
      event: t.event.title,
      status: t.status,
      quantity: t.quantity,
      amountCents: t.amountCents,
      externalReference: t.externalReference,
      pendingAdditionQuantity: t.pendingAdditionQuantity,
      pendingAdditionExternalReference: t.pendingAdditionExternalReference,
      mpPaymentId: t.mpPaymentId,
      id: t.id,
    });
  }
  await prisma.$disconnect();
})();
