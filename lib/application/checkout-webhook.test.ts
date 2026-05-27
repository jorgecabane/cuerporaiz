import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mercadopagoConfigRepository: {
    findByMpUserId: vi.fn(),
  },
  orderRepository: {
    findByExternalReference: vi.fn(),
    findByMpPaymentId: vi.fn(),
    updateStatus: vi.fn(),
  },
  webhookEventRepository: {
    wasProcessed: vi.fn(),
    markProcessed: vi.fn(),
  },
  paymentProvider: {
    getPayment: vi.fn(),
  },
  verifyMercadoPagoWebhookSignature: vi.fn(),
  sendSecurityAlert: vi.fn(),
  activatePlanForOrder: vi.fn(),
}));

vi.mock("@/lib/adapters/db", () => ({
  mercadopagoConfigRepository: mocks.mercadopagoConfigRepository,
  orderRepository: mocks.orderRepository,
  webhookEventRepository: mocks.webhookEventRepository,
  centerRepository: { findById: vi.fn(), findBySlug: vi.fn() },
  planRepository: { findById: vi.fn() },
  eventTicketRepository: { findByExternalReference: vi.fn() },
  eventRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
}));

vi.mock("@/lib/adapters/payment", () => ({
  mercadoPagoPaymentAdapter: mocks.paymentProvider,
}));

vi.mock("./verify-webhook-signature", () => ({
  verifyMercadoPagoWebhookSignature: mocks.verifyMercadoPagoWebhookSignature,
}));

vi.mock("./security-alerts", () => ({
  sendSecurityAlert: mocks.sendSecurityAlert,
}));

vi.mock("./activate-plan", () => ({
  activatePlanForOrder: mocks.activatePlanForOrder,
}));

import { processWebhookUseCase } from "./checkout";

const VALID_INPUT = {
  bodyRaw: JSON.stringify({
    type: "payment",
    data: { id: "pay_123" },
    user_id: "mp_user_A",
  }),
  xSignature: "ts=1234,v1=deadbeef",
  xRequestId: "req-abc",
};

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order_1",
    centerId: "center_A",
    userId: "user_1",
    planId: "plan_1",
    amountCents: 10000,
    currency: "CLP",
    status: "PENDING",
    externalReference: "ext_ref_1",
    mpPaymentId: null,
    ...overrides,
  };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay_123",
    status: "approved",
    statusDetail: null,
    externalReference: "ext_ref_1",
    transactionAmount: 10000,
    dateApproved: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MP_WEBHOOK_SECRET", "fake-secret");
  mocks.verifyMercadoPagoWebhookSignature.mockReturnValue(true);
  mocks.mercadopagoConfigRepository.findByMpUserId.mockResolvedValue({
    centerId: "center_A",
    accessToken: "access_token_A",
    enabled: true,
  });
  mocks.webhookEventRepository.wasProcessed.mockResolvedValue(false);
  mocks.webhookEventRepository.markProcessed.mockResolvedValue(undefined);
  mocks.orderRepository.updateStatus.mockResolvedValue(undefined);
  mocks.paymentProvider.getPayment.mockResolvedValue(makePayment());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("processWebhookUseCase — C2: order/center mismatch", () => {
  it("rechaza si order.centerId !== centerId resuelto y deja PENDING", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(
      makeOrder({ centerId: "center_B" })
    );

    const result = await processWebhookUseCase(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(mocks.orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(mocks.activatePlanForOrder).not.toHaveBeenCalled();
  });

  it("manda alerta de seguridad mp_center_mismatch con metadata diagnóstica", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(
      makeOrder({ id: "order_X", centerId: "center_B" })
    );

    await processWebhookUseCase(VALID_INPUT);

    expect(mocks.sendSecurityAlert).toHaveBeenCalledTimes(1);
    const alert = mocks.sendSecurityAlert.mock.calls[0][0];
    expect(alert.kind).toBe("mp_center_mismatch");
    expect(alert.severity).toBe("CRITICAL");
    expect(alert.metadata).toMatchObject({
      orderId: "order_X",
      orderCenterId: "center_B",
      resolvedCenterId: "center_A",
    });
  });

  it("marca el evento como procesado para que MP no reintente", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(
      makeOrder({ centerId: "center_B" })
    );

    await processWebhookUseCase(VALID_INPUT);

    expect(mocks.webhookEventRepository.markProcessed).toHaveBeenCalledWith(
      "center_A",
      "req-abc"
    );
  });
});

describe("processWebhookUseCase — C3: payment/order amount mismatch", () => {
  it("rechaza si payment.transactionAmount !== order.amountCents y deja PENDING", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(
      makeOrder({ amountCents: 10000 })
    );
    mocks.paymentProvider.getPayment.mockResolvedValue(
      makePayment({ transactionAmount: 1 })
    );

    const result = await processWebhookUseCase(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(mocks.orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(mocks.activatePlanForOrder).not.toHaveBeenCalled();
  });

  it("manda alerta de seguridad mp_amount_mismatch", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(
      makeOrder({ id: "order_Y", amountCents: 10000 })
    );
    mocks.paymentProvider.getPayment.mockResolvedValue(
      makePayment({ transactionAmount: 1 })
    );

    await processWebhookUseCase(VALID_INPUT);

    expect(mocks.sendSecurityAlert).toHaveBeenCalledTimes(1);
    const alert = mocks.sendSecurityAlert.mock.calls[0][0];
    expect(alert.kind).toBe("mp_amount_mismatch");
    expect(alert.severity).toBe("CRITICAL");
    expect(alert.metadata).toMatchObject({
      orderId: "order_Y",
      expectedAmountCents: 10000,
      paidTransactionAmount: 1,
    });
  });

  it("marca el evento como procesado en mismatch de monto", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(makeOrder());
    mocks.paymentProvider.getPayment.mockResolvedValue(
      makePayment({ transactionAmount: 1 })
    );

    await processWebhookUseCase(VALID_INPUT);

    expect(mocks.webhookEventRepository.markProcessed).toHaveBeenCalled();
  });
});

describe("processWebhookUseCase — happy path (sanity)", () => {
  it("activa el plan cuando todo cuadra: centerId match + amount match + approved", async () => {
    mocks.orderRepository.findByExternalReference.mockResolvedValue(makeOrder());

    const result = await processWebhookUseCase(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(mocks.orderRepository.updateStatus).toHaveBeenCalledWith(
      "order_1",
      "APPROVED",
      "pay_123"
    );
    expect(mocks.activatePlanForOrder).toHaveBeenCalledWith(
      "order_1",
      "user_1",
      "plan_1",
      "center_A"
    );
    expect(mocks.sendSecurityAlert).not.toHaveBeenCalled();
  });
});

describe("processWebhookUseCase — invalid signature alerts", () => {
  it("manda alerta mp_invalid_signature cuando la firma no valida", async () => {
    mocks.verifyMercadoPagoWebhookSignature.mockReturnValue(false);

    const result = await processWebhookUseCase(VALID_INPUT);

    expect(result.success).toBe(false);
    expect(mocks.sendSecurityAlert).toHaveBeenCalledTimes(1);
    const alert = mocks.sendSecurityAlert.mock.calls[0][0];
    expect(alert.kind).toBe("mp_invalid_signature");
    expect(alert.severity).toBe("HIGH");
  });
});
