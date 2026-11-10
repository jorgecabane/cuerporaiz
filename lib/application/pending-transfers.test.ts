import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: { order: { findMany: vi.fn() }, eventTicket: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/adapters/db/prisma";
import { getPendingTransfers, pendingTransferOrderWhere, pendingTransferTicketWhere } from "./pending-transfers";

const orders = vi.mocked(prisma.order.findMany);
const tickets = vi.mocked(prisma.eventTicket.findMany);
const d = (s: string) => new Date(s);

beforeEach(() => vi.clearAllMocks());

describe("where de transferencias pendientes", () => {
  it("orden: PENDING + TRANSFER + ya avisada, del centro", () => {
    expect(pendingTransferOrderWhere("c1")).toEqual({
      centerId: "c1",
      status: "PENDING",
      paymentMethod: "TRANSFER",
      transferClaimedAt: { not: null },
    });
  });

  it("orden de una alumna agrega userId", () => {
    expect(pendingTransferOrderWhere("c1", "u1")).toMatchObject({ userId: "u1", centerId: "c1" });
  });

  it("ticket filtra el centro vía el evento", () => {
    expect(pendingTransferTicketWhere("c1", "u1")).toEqual({
      userId: "u1",
      status: "PENDING",
      paymentMethod: "TRANSFER",
      transferClaimedAt: { not: null },
      event: { centerId: "c1" },
    });
  });
});

describe("getPendingTransfers", () => {
  it("cuenta órdenes + tickets y devuelve el aviso más antiguo", async () => {
    orders.mockResolvedValue([{ transferClaimedAt: d("2026-11-05") }] as never);
    tickets.mockResolvedValue([{ transferClaimedAt: d("2026-11-02") }, { transferClaimedAt: d("2026-11-09") }] as never);

    await expect(getPendingTransfers("c1")).resolves.toEqual({ count: 3, oldestClaimedAt: d("2026-11-02") });
  });

  it("sin pendientes: 0 y null", async () => {
    orders.mockResolvedValue([] as never);
    tickets.mockResolvedValue([] as never);
    await expect(getPendingTransfers("c1", "u1")).resolves.toEqual({ count: 0, oldestClaimedAt: null });
  });

  it("de una alumna busca hasta 50; del centro, hasta 100", async () => {
    orders.mockResolvedValue([] as never);
    tickets.mockResolvedValue([] as never);
    await getPendingTransfers("c1", "u1");
    expect(orders).toHaveBeenLastCalledWith(expect.objectContaining({ take: 50, where: pendingTransferOrderWhere("c1", "u1") }));
    await getPendingTransfers("c1");
    expect(tickets).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100, where: pendingTransferTicketWhere("c1") }));
  });
});
