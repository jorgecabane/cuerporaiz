import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimTransferForOrder } from "./claim-transfer";

vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: { findById: vi.fn() },
  planRepository: { findById: vi.fn() },
  eventRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  siteConfigRepository: { findByCenterId: vi.fn().mockResolvedValue(null) },
}));

vi.mock("./send-email", () => ({
  sendEmailSafe: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  buildTransferReceivedEmail: vi.fn().mockReturnValue({ subject: "received" }),
}));

import { prisma } from "@/lib/adapters/db/prisma";
import { centerRepository, planRepository, userRepository } from "@/lib/adapters/db";
import { sendEmailSafe } from "./send-email";

const baseOrder = {
  id: "ord-1",
  userId: "user-1",
  centerId: "center-1",
  planId: "plan-1",
  amountCents: 29900,
  currency: "CLP",
  status: "PENDING" as const,
  paymentMethod: "MERCADOPAGO" as const,
  transferClaimedAt: null as Date | null,
};

const enabledCenter = {
  id: "center-1",
  name: "Cuerpo Raíz",
  bankTransferEnabled: true,
  bankTransferAcceptPlans: true,
  bankTransferAcceptEvents: false,
  bankTransferRequireReceipt: true,
};

describe("claimTransferForOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ ...baseOrder });
    (centerRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...enabledCenter });
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

  it("happy path: marca la orden como TRANSFER + claim + comprobante y dispara mail", async () => {
    const result = await claimTransferForOrder({
      orderId: "ord-1",
      userId: "user-1",
      receiptDocId: "receipt-doc-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.redirectTo).toBe("/panel/mis-pagos?recien=ord-1");
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-1" },
        data: expect.objectContaining({
          paymentMethod: "TRANSFER",
          transferReceiptSanityId: "receipt-doc-abc",
        }),
      }),
    );
    expect(sendEmailSafe).toHaveBeenCalled();
  });

  it("rechaza si la orden no es del usuario", async () => {
    const result = await claimTransferForOrder({
      orderId: "ord-1",
      userId: "other-user",
      receiptDocId: "doc-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("FORBIDDEN");
  });

  it("rechaza si la orden ya fue claimada", async () => {
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseOrder,
      transferClaimedAt: new Date(),
    });
    const result = await claimTransferForOrder({
      orderId: "ord-1",
      userId: "user-1",
      receiptDocId: "doc-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("ALREADY_CLAIMED");
  });

  it("rechaza si el centro desactivó transferencia para planes", async () => {
    (centerRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...enabledCenter,
      bankTransferAcceptPlans: false,
    });
    const result = await claimTransferForOrder({
      orderId: "ord-1",
      userId: "user-1",
      receiptDocId: "doc-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("TRANSFER_DISABLED_FOR_TYPE");
  });

  it("rechaza si comprobante es obligatorio y no viene", async () => {
    const result = await claimTransferForOrder({
      orderId: "ord-1",
      userId: "user-1",
      receiptDocId: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("RECEIPT_REQUIRED");
  });

  it("permite claimar sin comprobante si el centro no lo exige", async () => {
    (centerRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...enabledCenter,
      bankTransferRequireReceipt: false,
    });
    const result = await claimTransferForOrder({
      orderId: "ord-1",
      userId: "user-1",
      receiptDocId: null,
    });
    expect(result.success).toBe(true);
  });
});
