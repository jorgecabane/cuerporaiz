/**
 * Simula el efecto de un webhook MP approved para un EventTicket. NO POST-ea
 * al endpoint (que requeriría firma HMAC + llamada a la API MP); ejecuta la
 * misma lógica del fallback `tryProcessEventTicketPayment` aplicando los
 * cambios directos al ticket via Prisma.
 *
 * Útil para validar end-to-end local sin MP funcionando.
 *
 * Uso:
 *   tsx prisma/scripts/simulate-mp-webhook-event.ts <ticketId>
 *   tsx prisma/scripts/simulate-mp-webhook-event.ts <ticketId> --addition  # confirma addition
 *   tsx prisma/scripts/simulate-mp-webhook-event.ts <ticketId> --reject    # marca CANCELLED / limpia pending
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no definida");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const ticketId = args.find((a) => !a.startsWith("--"));
  if (!ticketId) {
    console.error("Falta ticketId. Uso: tsx prisma/scripts/simulate-mp-webhook-event.ts <ticketId>");
    process.exit(1);
  }
  const isAddition = args.includes("--addition");
  const reject = args.includes("--reject");

  const ticket = await prisma.eventTicket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) {
    console.error(`Ticket ${ticketId} no existe`);
    process.exit(1);
  }

  console.log("Ticket antes:", {
    id: ticket.id,
    status: ticket.status,
    quantity: ticket.quantity,
    pendingAdditionQuantity: ticket.pendingAdditionQuantity,
    externalReference: ticket.externalReference,
    pendingAdditionExternalReference: ticket.pendingAdditionExternalReference,
  });

  if (reject) {
    if (isAddition) {
      await prisma.eventTicket.update({
        where: { id: ticketId },
        data: { pendingAdditionQuantity: 0, pendingAdditionExternalReference: null },
      });
      console.log(`\n✔ Addition rechazada — pending limpiado, quantity intacto.`);
    } else {
      await prisma.eventTicket.update({
        where: { id: ticketId },
        data: { status: "CANCELLED" },
      });
      console.log(`\n✔ Compra inicial rechazada — status = CANCELLED.`);
    }
  } else {
    const mpPaymentId = `fake-mp-${Date.now()}`;
    const updateData: Record<string, unknown> = {
      status: "PAID",
      mpPaymentId,
      paidAt: ticket.paidAt ?? new Date(),
    };
    if (isAddition) {
      updateData.quantity = { increment: ticket.pendingAdditionQuantity };
      updateData.pendingAdditionQuantity = 0;
      updateData.pendingAdditionExternalReference = null;
    }
    await prisma.eventTicket.update({ where: { id: ticketId }, data: updateData });
    console.log(
      `\n✔ Webhook approved simulado (${isAddition ? "addition" : "purchase"}) → PAID + mpPaymentId=${mpPaymentId}`
    );
  }

  const after = await prisma.eventTicket.findUnique({ where: { id: ticketId } });
  console.log("Ticket después:", {
    status: after!.status,
    quantity: after!.quantity,
    pendingAdditionQuantity: after!.pendingAdditionQuantity,
    paidAt: after!.paidAt,
    mpPaymentId: after!.mpPaymentId,
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
