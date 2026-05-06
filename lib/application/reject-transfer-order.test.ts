import { describe, it, expect, vi, beforeEach } from "vitest";
import { rejectTransferOrder } from "./reject-transfer-order";

vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eventTicket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: { findById: vi.fn() },
  planRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
}));

vi.mock("./send-email", () => ({
  sendEmailSafe: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  buildTransferRejectedEmail: vi.fn().mockReturnValue({ subject: "rejected" }),
}));

import { prisma } from "@/lib/adapters/db/prisma";
import { centerRepository, planRepository, userRepository } from "@/lib/adapters/db";
import { sendEmailSafe } from "./send-email";

const validOrder = {
  id: "ord-1",
  userId: "user-1",
  centerId: "center-1",
  planId: "plan-1",
  amountCents: 29900,
  status: "PENDING" as const,
  paymentMethod: "TRANSFER" as const,
  transferClaimedAt: new Date("2026-05-01T10:00:00Z"),
};

describe("rejectTransferOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validOrder);
    (centerRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "center-1",
      name: "Cuerpo Raíz",
      bankAccountEmail: "trini@example.com",
    });
    (planRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "plan-1",
      name: "Plan 8 clases",
    });
    (userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "alumna@example.com",
      name: "Ana",
    });
  });

  it("rechaza si el motivo es muy corto", async () => {
    const result = await rejectTransferOrder({
      orderId: "ord-1",
      reason: "corto",
      adminCenterId: "center-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("REASON_TOO_SHORT");
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("rechaza si la orden no es del centro del admin", async () => {
    const result = await rejectTransferOrder({
      orderId: "ord-1",
      reason: "monto incorrecto recibido",
      adminCenterId: "center-other",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("FORBIDDEN");
  });

  it("rechaza si la orden no está pendiente por transferencia", async () => {
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...validOrder,
      transferClaimedAt: null,
    });
    const result = await rejectTransferOrder({
      orderId: "ord-1",
      reason: "monto incorrecto recibido",
      adminCenterId: "center-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("INVALID_STATE");
  });

  it("rechaza correctamente y dispara mail con motivo literal", async () => {
    const reason = "el monto recibido fue $19.900";
    const result = await rejectTransferOrder({
      orderId: "ord-1",
      reason,
      adminCenterId: "center-1",
    });
    expect(result.success).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: { status: "CANCELLED", transferRejectedReason: reason },
    });
    expect(sendEmailSafe).toHaveBeenCalled();
  });
});
