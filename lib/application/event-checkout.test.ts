import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventCheckout } from "./event-checkout";
import type { Event, EventTicket } from "@/lib/domain/event";

const mocks = vi.hoisted(() => ({
  eventRepository: {
    findById: vi.fn(),
  },
  eventTicketRepository: {
    findByEventAndUser: vi.fn(),
    countPaidByEventId: vi.fn(),
    create: vi.fn(),
    resetPending: vi.fn(),
    updateStatus: vi.fn(),
    setExternalReference: vi.fn(),
    setPendingAdditionReference: vi.fn(),
    incrementQuantity: vi.fn(),
    clearPendingAddition: vi.fn(),
  },
  mercadopagoConfigRepository: {
    findByCenterId: vi.fn(),
  },
  centerRepository: {
    findById: vi.fn(),
  },
  mercadoPagoPaymentAdapter: {
    createPreference: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  eventRepository: mocks.eventRepository,
  eventTicketRepository: mocks.eventTicketRepository,
  mercadopagoConfigRepository: mocks.mercadopagoConfigRepository,
  centerRepository: mocks.centerRepository,
}));

vi.mock("@/lib/adapters/payment", () => ({
  mercadoPagoPaymentAdapter: mocks.mercadoPagoPaymentAdapter,
}));

const BASE_INPUT = {
  eventId: "event-1",
  centerId: "center-1",
  userId: "user-1",
  baseUrl: "https://example.com",
  payerEmail: "test@example.com",
};

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    centerId: "center-1",
    title: "Retiro de Yoga",
    description: null,
    location: "Santiago",
    imageUrl: null,
    startsAt: new Date("2026-05-01T10:00:00Z"),
    endsAt: new Date("2026-05-01T12:00:00Z"),
    amountCents: 10000,
    currency: "CLP",
    maxCapacity: null,
    status: "PUBLISHED",
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTicket(overrides: Partial<EventTicket> = {}): EventTicket {
  return {
    id: "ticket-1",
    eventId: "event-1",
    userId: "user-1",
    amountCents: 10000,
    quantity: 1,
    currency: "CLP",
    status: "PENDING",
    mpPaymentId: null,
    externalReference: null,
    pendingAdditionQuantity: 0,
    pendingAdditionExternalReference: null,
    orderId: null,
    paidAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("createEventCheckout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
    vi.clearAllMocks();
    mocks.eventRepository.findById.mockResolvedValue(makeEvent());
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(null);
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(0);
    mocks.eventTicketRepository.create.mockResolvedValue(makeTicket());
    mocks.eventTicketRepository.resetPending.mockResolvedValue(makeTicket());
    mocks.eventTicketRepository.setExternalReference.mockImplementation((id) =>
      Promise.resolve(makeTicket({ id, externalReference: "evt_xxx" }))
    );
    mocks.eventTicketRepository.setPendingAdditionReference.mockImplementation((id, data) =>
      Promise.resolve(
        makeTicket({
          id,
          status: "PAID",
          pendingAdditionExternalReference: data.reference,
          pendingAdditionQuantity: data.quantity,
        })
      )
    );
    mocks.eventTicketRepository.incrementQuantity.mockImplementation((id, delta) =>
      Promise.resolve(makeTicket({ id, status: "PAID", quantity: 1 + delta }))
    );
    mocks.eventTicketRepository.clearPendingAddition.mockResolvedValue(makeTicket({ status: "PAID" }));
    mocks.mercadopagoConfigRepository.findByCenterId.mockResolvedValue({
      centerId: "center-1",
      accessToken: "TEST_TOKEN",
      enabled: true,
      mpUserId: null,
    });
    // Centro sin transferencia para eventos por default → camino MP tradicional.
    mocks.centerRepository.findById.mockResolvedValue({
      id: "center-1",
      bankTransferEnabled: false,
      bankTransferAcceptEvents: false,
    });
    mocks.mercadoPagoPaymentAdapter.createPreference.mockResolvedValue({
      success: true,
      checkoutUrl: "https://mp.com/checkout",
      preferenceId: "pref-1",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("evento de pago: crea ticket PENDING y devuelve checkoutUrl", async () => {
    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ticket.status).toBe("PENDING");
      expect(result.checkoutUrl).toBe("https://mp.com/checkout");
    }
    expect(mocks.eventTicketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event-1",
        userId: "user-1",
        amountCents: 10000,
        quantity: 1,
      })
    );
    expect(mocks.eventTicketRepository.resetPending).not.toHaveBeenCalled();
    expect(mocks.mercadoPagoPaymentAdapter.createPreference).toHaveBeenCalledOnce();
    expect(mocks.eventTicketRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("evento gratuito: crea ticket PAID directamente, sin MP", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ amountCents: 0 }));
    const freeTicket = makeTicket({ amountCents: 0, status: "PENDING" });
    const paidTicket = makeTicket({ amountCents: 0, status: "PAID", paidAt: new Date() });
    mocks.eventTicketRepository.create.mockResolvedValue(freeTicket);
    mocks.eventTicketRepository.updateStatus.mockResolvedValue(paidTicket);

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ticket.status).toBe("PAID");
      expect(result.checkoutUrl).toBeUndefined();
    }
    expect(mocks.mercadoPagoPaymentAdapter.createPreference).not.toHaveBeenCalled();
    expect(mocks.eventTicketRepository.updateStatus).toHaveBeenCalledWith(
      freeTicket.id,
      "PAID",
      expect.objectContaining({ paidAt: expect.any(Date) })
    );
  });

  it("ya tiene ticket PAID → ALREADY_PURCHASED", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PAID" })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ALREADY_PURCHASED");
    }
    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
    expect(mocks.eventTicketRepository.resetPending).not.toHaveBeenCalled();
  });

  it("ticket REFUNDED → ALREADY_PURCHASED (admin-only re-emisión)", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "REFUNDED" })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ALREADY_PURCHASED");
    }
  });

  it("ticket previo PENDING → reusa el mismo registro (fix P2002)", async () => {
    const existingPending = makeTicket({ id: "existing-1", status: "PENDING" });
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(existingPending);
    mocks.eventTicketRepository.resetPending.mockResolvedValue(
      makeTicket({ id: "existing-1", status: "PENDING" })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
    expect(mocks.eventTicketRepository.resetPending).toHaveBeenCalledWith(
      "existing-1",
      expect.objectContaining({ amountCents: 10000, quantity: 1, currency: "CLP" })
    );
    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
  });

  it("ticket previo CANCELLED → reusa el mismo registro (no rompe @@unique)", async () => {
    const existingCancelled = makeTicket({ id: "existing-2", status: "CANCELLED" });
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(existingCancelled);
    mocks.eventTicketRepository.resetPending.mockResolvedValue(
      makeTicket({ id: "existing-2", status: "PENDING" })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
    expect(mocks.eventTicketRepository.resetPending).toHaveBeenCalledWith(
      "existing-2",
      expect.any(Object)
    );
    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
  });

  it("evento lleno → EVENT_FULL", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 10 }));
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(10);

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_FULL");
    }
    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
  });

  it("evento con capacidad disponible → no falla por capacidad", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 10 }));
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(9);

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
  });

  it("evento no publicado → EVENT_NOT_PUBLISHED", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ status: "DRAFT" }));

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_NOT_PUBLISHED");
    }
  });

  it("evento ya finalizado (endsAt pasado) → EVENT_ENDED", async () => {
    mocks.eventRepository.findById.mockResolvedValue(
      makeEvent({
        startsAt: new Date("2020-01-01T10:00:00Z"),
        endsAt: new Date("2020-01-01T12:00:00Z"),
      })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_ENDED");
    }
    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
  });

  it("evento en curso (startsAt pasado pero endsAt futuro) → permite checkout", async () => {
    mocks.eventRepository.findById.mockResolvedValue(
      makeEvent({
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
  });

  it("evento no encontrado → EVENT_NOT_FOUND", async () => {
    mocks.eventRepository.findById.mockResolvedValue(null);

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_NOT_FOUND");
    }
  });

  it("evento de otro centro → EVENT_NOT_FOUND", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ centerId: "other-center" }));

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_NOT_FOUND");
    }
  });

  it("MP no configurado → MP_NOT_CONFIGURED", async () => {
    mocks.mercadopagoConfigRepository.findByCenterId.mockResolvedValue(null);

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MP_NOT_CONFIGURED");
    }
  });

  it("MP deshabilitado → MP_NOT_CONFIGURED", async () => {
    mocks.mercadopagoConfigRepository.findByCenterId.mockResolvedValue({
      centerId: "center-1",
      accessToken: "TOKEN",
      enabled: false,
      mpUserId: null,
    });

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MP_NOT_CONFIGURED");
    }
  });

  it("MP devuelve error → MP_PREFERENCE_FAILED", async () => {
    mocks.mercadoPagoPaymentAdapter.createPreference.mockResolvedValue({
      success: false,
      error: "Error en MP",
    });

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MP_PREFERENCE_FAILED");
    }
  });

  // ── Multi-cupos ────────────────────────────────────────────────────────

  it("quantity > 1: crea ticket con amount = unit * quantity y envía quantity a MP", async () => {
    mocks.eventTicketRepository.create.mockResolvedValue(
      makeTicket({ amountCents: 30000, quantity: 3 })
    );

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 3 });

    expect(result.success).toBe(true);
    expect(mocks.eventTicketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 30000, quantity: 3 })
    );
    expect(mocks.mercadoPagoPaymentAdapter.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 10000, quantity: 3 })
    );
  });

  it("quantity 0 o negativo → INVALID_QUANTITY", async () => {
    const r1 = await createEventCheckout({ ...BASE_INPUT, quantity: 0 });
    expect(r1.success).toBe(false);
    if (!r1.success) expect(r1.code).toBe("INVALID_QUANTITY");

    const r2 = await createEventCheckout({ ...BASE_INPUT, quantity: -1 });
    expect(r2.success).toBe(false);
    if (!r2.success) expect(r2.code).toBe("INVALID_QUANTITY");

    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
  });

  it("quantity supera cupos disponibles → EVENT_FULL con mensaje accionable", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 10 }));
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(8);

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 3 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_FULL");
      expect(result.message).toContain("2");
    }
    expect(mocks.eventTicketRepository.create).not.toHaveBeenCalled();
  });

  it("evento gratuito multi-cupos: crea ticket PAID con quantity > 1", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ amountCents: 0 }));
    const freeTicket = makeTicket({ amountCents: 0, status: "PENDING", quantity: 2 });
    const paidTicket = makeTicket({ amountCents: 0, status: "PAID", quantity: 2, paidAt: new Date() });
    mocks.eventTicketRepository.create.mockResolvedValue(freeTicket);
    mocks.eventTicketRepository.updateStatus.mockResolvedValue(paidTicket);

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2 });

    expect(result.success).toBe(true);
    expect(mocks.eventTicketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 2, amountCents: 0 })
    );
  });

  it("compra inicial pagada: persiste externalReference en el ticket", async () => {
    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
    expect(mocks.eventTicketRepository.setExternalReference).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^evt_/)
    );
    // El externalReference enviado a MP debe coincidir con el persistido.
    const setRefCall = mocks.eventTicketRepository.setExternalReference.mock.calls[0];
    const mpCall = mocks.mercadoPagoPaymentAdapter.createPreference.mock.calls[0][0];
    expect(setRefCall[1]).toBe(mpCall.externalReference);
  });

  // ── Re-compra (mode: "addition") ─────────────────────────────────────

  it("addition sin ticket previo → INVALID_MODE", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(null);

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2, mode: "addition" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_MODE");
    }
  });

  it("addition con ticket PENDING (no PAID) → INVALID_MODE", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PENDING" })
    );

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2, mode: "addition" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_MODE");
    }
  });

  it("addition con pendingAdditionQuantity > 0 → INVALID_MODE (ya hay otra pendiente)", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PAID", pendingAdditionQuantity: 1 })
    );

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2, mode: "addition" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_MODE");
      expect(result.message).toContain("pendientes");
    }
  });

  it("addition free: incrementa quantity directo, sin MP, email kind=addition", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ amountCents: 0 }));
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PAID", quantity: 1, amountCents: 0 })
    );
    mocks.eventTicketRepository.incrementQuantity.mockResolvedValue(
      makeTicket({ status: "PAID", quantity: 3, amountCents: 0 })
    );

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2, mode: "addition" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ticket.quantity).toBe(3);
      expect(result.checkoutUrl).toBeUndefined();
    }
    expect(mocks.eventTicketRepository.incrementQuantity).toHaveBeenCalledWith(
      expect.any(String),
      2
    );
    expect(mocks.mercadoPagoPaymentAdapter.createPreference).not.toHaveBeenCalled();
    expect(mocks.eventTicketRepository.setPendingAdditionReference).not.toHaveBeenCalled();
  });

  it("addition pagada: setea pendingAdditionReference y devuelve checkoutUrl", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PAID", quantity: 1 })
    );

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2, mode: "addition" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.checkoutUrl).toBe("https://mp.com/checkout");
    }
    expect(mocks.eventTicketRepository.setPendingAdditionReference).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ quantity: 2, reference: expect.stringMatching(/^evt_/) })
    );
    expect(mocks.mercadoPagoPaymentAdapter.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 2, unitPrice: 10000 })
    );
    expect(mocks.eventTicketRepository.incrementQuantity).not.toHaveBeenCalled();
  });

  it("addition: capacidad excedida → EVENT_FULL", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 10 }));
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PAID", quantity: 3 })
    );
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(9);

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 5, mode: "addition" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EVENT_FULL");
      expect(result.message).toContain("1");
    }
  });

  it("addition pagada: si MP falla, hace rollback del pendingAddition", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PAID", quantity: 1 })
    );
    mocks.mercadoPagoPaymentAdapter.createPreference.mockResolvedValue({
      success: false,
      error: "MP timeout",
    });

    const result = await createEventCheckout({ ...BASE_INPUT, quantity: 2, mode: "addition" });

    expect(result.success).toBe(false);
    expect(mocks.eventTicketRepository.clearPendingAddition).toHaveBeenCalled();
  });
});
