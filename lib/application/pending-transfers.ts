/**
 * Transferencias pendientes: la alumna marcó "ya transferí" (transferClaimedAt) y el
 * admin todavía no aprueba ni rechaza. Aplica a Order (planes) y EventTicket (eventos).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/adapters/db/prisma";

export interface PendingTransferSummary {
  count: number;
  oldestClaimedAt: Date | null;
}

const PENDING_TRANSFER = { status: "PENDING", paymentMethod: "TRANSFER", transferClaimedAt: { not: null } } as const;

/** Sin userId: todas las del centro (admin). */
export function pendingTransferOrderWhere(centerId: string, userId?: string): Prisma.OrderWhereInput {
  return { ...(userId && { userId }), centerId, ...PENDING_TRANSFER };
}

export function pendingTransferTicketWhere(centerId: string, userId?: string): Prisma.EventTicketWhereInput {
  return { ...(userId && { userId }), ...PENDING_TRANSFER, event: { centerId } };
}

export async function getPendingTransfers(centerId: string, userId?: string): Promise<PendingTransferSummary> {
  const query = { select: { transferClaimedAt: true }, orderBy: { transferClaimedAt: "asc" }, take: userId ? 50 : 100 } as const;
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({ where: pendingTransferOrderWhere(centerId, userId), ...query }),
    prisma.eventTicket.findMany({ where: pendingTransferTicketWhere(centerId, userId), ...query }),
  ]);
  const all = [...orders, ...tickets]
    .map((x) => x.transferClaimedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());
  return { count: all.length, oldestClaimedAt: all[0] ?? null };
}
