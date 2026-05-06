/**
 * Helpers server-only para consultar transferencias pendientes:
 * - desde el lado de la alumna (sus propias órdenes/tickets pendientes)
 * - desde el lado del admin (todas las del centro)
 */
import { prisma } from "@/lib/adapters/db/prisma";

export interface PendingTransferSummary {
  count: number;
  oldestClaimedAt: Date | null;
}

/**
 * Cuenta las transferencias pendientes (Order + EventTicket) de una alumna.
 * Una transferencia "pendiente" = paymentMethod=TRANSFER, estado PENDING y
 * transferClaimedAt no nulo (la alumna ya marcó "ya transferí" pero el admin
 * no aprobó/rechazó todavía).
 */
export async function getPendingTransfersForUser(
  userId: string,
  centerId: string,
): Promise<PendingTransferSummary> {
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({
      where: {
        userId,
        centerId,
        status: "PENDING",
        paymentMethod: "TRANSFER",
        transferClaimedAt: { not: null },
      },
      select: { transferClaimedAt: true },
      orderBy: { transferClaimedAt: "asc" },
      take: 50,
    }),
    prisma.eventTicket.findMany({
      where: {
        userId,
        status: "PENDING",
        paymentMethod: "TRANSFER",
        transferClaimedAt: { not: null },
        event: { centerId },
      },
      select: { transferClaimedAt: true },
      orderBy: { transferClaimedAt: "asc" },
      take: 50,
    }),
  ]);
  const all = [...orders, ...tickets]
    .map((x) => x.transferClaimedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());
  return {
    count: all.length,
    oldestClaimedAt: all[0] ?? null,
  };
}

export async function getPendingTransfersForCenter(
  centerId: string,
): Promise<PendingTransferSummary> {
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({
      where: {
        centerId,
        status: "PENDING",
        paymentMethod: "TRANSFER",
        transferClaimedAt: { not: null },
      },
      select: { transferClaimedAt: true },
      orderBy: { transferClaimedAt: "asc" },
      take: 100,
    }),
    prisma.eventTicket.findMany({
      where: {
        status: "PENDING",
        paymentMethod: "TRANSFER",
        transferClaimedAt: { not: null },
        event: { centerId },
      },
      select: { transferClaimedAt: true },
      orderBy: { transferClaimedAt: "asc" },
      take: 100,
    }),
  ]);
  const all = [...orders, ...tickets]
    .map((x) => x.transferClaimedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());
  return {
    count: all.length,
    oldestClaimedAt: all[0] ?? null,
  };
}
