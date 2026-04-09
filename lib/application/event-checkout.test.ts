import { describe, it, expect, vi, beforeEach } from "vitest";
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
    updateStatus: vi.fn(),
  },
  mercadopagoConfigRepository: {
    findByCenterId: vi.fn(),
  },
  mercadoPagoPaymentAdapter: {
    createPreference: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  eventRepository: mocks.eventRepository,
  eventTicketRepository: mocks.eventTicketRepository,
  mercadopagoConfigRepository: mocks.mercadopagoConfigRepository,
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
    currency: "CLP",
    status: "PENDING",
    mpPaymentId: null,
    orderId: null,
    paidAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("createEventCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventRepository.findById.mockResolvedValue(makeEvent());
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(null);
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(0);
    mocks.eventTicketRepository.create.mockResolvedValue(makeTicket());
    mocks.mercadopagoConfigRepository.findByCenterId.mockResolvedValue({
      accessToken: "TEST_TOKEN",
      enabled: true,
      webhookSecret: "secret",
    });
    mocks.mercadoPagoPaymentAdapter.createPreference.mockResolvedValue({
      success: true,
      checkoutUrl: "https://mp.com/checkout",
      preferenceId: "pref-1",
    });
  });

  it("evento de pago: crea ticket PENDING y devuelve checkoutUrl", async () => {
    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ticket.status).toBe("PENDING");
      expect(result.checkoutUrl).toBe("https://mp.com/checkout");
    }
    expect(mocks.eventTicketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event-1", userId: "user-1", amountCents: 10000 })
    );
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
  });

  it("ticket previo PENDING (no PAID) → puede continuar", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue(
      makeTicket({ status: "PENDING" })
    );

    const result = await createEventCheckout(BASE_INPUT);

    expect(result.success).toBe(true);
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
      accessToken: "TOKEN",
      enabled: false,
      webhookSecret: "s",
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
});
