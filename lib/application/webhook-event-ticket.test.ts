/**
 * Tests focalizados del fallback de webhook MP → EventTicket.
 *
 * El webhook real (processWebhookUseCase) consulta la API de MP server-side
 * y verifica firmas, lo que dificulta el unit test end-to-end. Acá probamos
 * directamente `tryProcessEventTicketPayment` que es el corazón del fallback,
 * cubriendo el gap que dejó pasar el bug original (eventos pagados quedaban
 * PENDING porque el webhook solo miraba Order).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { tryProcessEventTicketPayment } from "./checkout";
import type { EventTicket, Event } from "@/lib/domain/event";

const mocks = vi.hoisted(() => ({
  eventTicketRepository: {
    findByExternalReference: vi.fn(),
    findByMpPaymentId: vi.fn(),
    applyApprovedPayment: vi.fn(),
    updateStatus: vi.fn(),
    clearPendingAddition: vi.fn(),
  },
  eventRepository: {
    findById: vi.fn(),
  },
  // Otros repos del módulo que no necesitamos acá pero hay que stubbear.
  orderRepository: {
    findByExternalReference: vi.fn(),
    findByMpPaymentId: vi.fn(),
    updateStatus: vi.fn(),
  },
  centerRepository: { findById: vi.fn() },
  mercadopagoConfigRepository: { findByCenterId: vi.fn(), findByMpUserId: vi.fn() },
  planRepository: { findById: vi.fn() },
  webhookEventRepository: { wasProcessed: vi.fn(), markProcessed: vi.fn() },
  userRepository: { findById: vi.fn() },
  notifyEventTicketConfirmation: vi.fn(),
}));

vi.mock("@/lib/adapters/db", () => ({
  eventTicketRepository: mocks.eventTicketRepository,
  eventRepository: mocks.eventRepository,
  orderRepository: mocks.orderRepository,
  centerRepository: mocks.centerRepository,
  mercadopagoConfigRepository: mocks.mercadopagoConfigRepository,
  planRepository: mocks.planRepository,
  webhookEventRepository: mocks.webhookEventRepository,
  userRepository: mocks.userRepository,
}));

vi.mock("./notify-event-ticket-confirmation", () => ({
  notifyEventTicketConfirmation: mocks.notifyEventTicketConfirmation,
}));

vi.mock("@/lib/adapters/payment", () => ({
  mercadoPagoPaymentAdapter: { createPreference: vi.fn(), getPayment: vi.fn() },
}));

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
    externalReference: "evt_initial",
    pendingAdditionQuantity: 0,
    pendingAdditionExternalReference: null,
    orderId: null,
    paidAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeEvent(): Event {
  return {
    id: "event-1",
    centerId: "center-1",
    title: "Retiro",
    description: null,
    location: null,
    imageUrl: null,
    startsAt: new Date("2026-06-01T10:00:00Z"),
    endsAt: new Date("2026-06-01T12:00:00Z"),
    amountCents: 10000,
    currency: "CLP",
    maxCapacity: null,
    status: "PUBLISHED",
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("tryProcessEventTicketPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventRepository.findById.mockResolvedValue(makeEvent());
    mocks.notifyEventTicketConfirmation.mockResolvedValue(undefined);
  });

  it("approved + ticket inicial: marca PAID y envía email kind=purchase", async () => {
    const ticket = makeTicket({ status: "PENDING" });
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue({
      ticket,
      isAddition: false,
    });
    const paid = makeTicket({ status: "PAID", quantity: 1, paidAt: new Date(), mpPaymentId: "mp-1" });
    mocks.eventTicketRepository.applyApprovedPayment.mockResolvedValue({
      ticket: paid,
      addedQuantity: 0,
    });

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_initial",
      mpPaymentId: "mp-1",
      mpStatus: "approved",
    });

    expect(handled).toBe(true);
    expect(mocks.eventTicketRepository.applyApprovedPayment).toHaveBeenCalledWith(
      "ticket-1",
      { mpPaymentId: "mp-1", isAddition: false }
    );
    expect(mocks.notifyEventTicketConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "purchase", quantity: 1, addedQuantity: 1 })
    );
  });

  it("approved + addition: suma quantity y envía email kind=addition con addedQuantity", async () => {
    const ticket = makeTicket({
      status: "PAID",
      quantity: 3,
      pendingAdditionQuantity: 2,
      pendingAdditionExternalReference: "evt_addition",
    });
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue({
      ticket,
      isAddition: true,
    });
    const paid = makeTicket({ status: "PAID", quantity: 5, mpPaymentId: "mp-2", pendingAdditionQuantity: 0 });
    mocks.eventTicketRepository.applyApprovedPayment.mockResolvedValue({
      ticket: paid,
      addedQuantity: 2,
    });

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_addition",
      mpPaymentId: "mp-2",
      mpStatus: "approved",
    });

    expect(handled).toBe(true);
    expect(mocks.notifyEventTicketConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "addition", quantity: 5, addedQuantity: 2 })
    );
  });

  it("rejected + ticket inicial: pasa a CANCELLED, sin email", async () => {
    const ticket = makeTicket({ status: "PENDING" });
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue({
      ticket,
      isAddition: false,
    });

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_initial",
      mpPaymentId: "mp-3",
      mpStatus: "rejected",
    });

    expect(handled).toBe(true);
    expect(mocks.eventTicketRepository.updateStatus).toHaveBeenCalledWith("ticket-1", "CANCELLED");
    expect(mocks.notifyEventTicketConfirmation).not.toHaveBeenCalled();
  });

  it("rejected + addition: limpia pendingAddition pero deja quantity intacto, sin email", async () => {
    const ticket = makeTicket({
      status: "PAID",
      quantity: 3,
      pendingAdditionQuantity: 2,
      pendingAdditionExternalReference: "evt_addition",
    });
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue({
      ticket,
      isAddition: true,
    });

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_addition",
      mpPaymentId: "mp-4",
      mpStatus: "rejected",
    });

    expect(handled).toBe(true);
    expect(mocks.eventTicketRepository.clearPendingAddition).toHaveBeenCalledWith("ticket-1");
    expect(mocks.eventTicketRepository.updateStatus).not.toHaveBeenCalled();
    expect(mocks.notifyEventTicketConfirmation).not.toHaveBeenCalled();
  });

  it("pending: no hace nada, devuelve true (deja el ticket como está)", async () => {
    const ticket = makeTicket({ status: "PENDING" });
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue({
      ticket,
      isAddition: false,
    });

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_initial",
      mpPaymentId: "mp-5",
      mpStatus: "pending",
    });

    expect(handled).toBe(true);
    expect(mocks.eventTicketRepository.applyApprovedPayment).not.toHaveBeenCalled();
    expect(mocks.eventTicketRepository.updateStatus).not.toHaveBeenCalled();
    expect(mocks.eventTicketRepository.clearPendingAddition).not.toHaveBeenCalled();
  });

  it("sin externalReference + sin mpPaymentId match: devuelve false (no es event ticket)", async () => {
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue(null);
    mocks.eventTicketRepository.findByMpPaymentId.mockResolvedValue(null);

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_nope",
      mpPaymentId: "mp-6",
      mpStatus: "approved",
    });

    expect(handled).toBe(false);
  });

  it("fallback por mpPaymentId cuando externalReference no matchea (reintento webhook)", async () => {
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue(null);
    const ticket = makeTicket({ status: "PAID", mpPaymentId: "mp-7" });
    mocks.eventTicketRepository.findByMpPaymentId.mockResolvedValue(ticket);
    mocks.eventTicketRepository.applyApprovedPayment.mockResolvedValue({
      ticket,
      addedQuantity: 0,
    });

    const handled = await tryProcessEventTicketPayment({
      externalReference: "",
      mpPaymentId: "mp-7",
      mpStatus: "approved",
    });

    expect(handled).toBe(true);
    expect(mocks.eventTicketRepository.findByMpPaymentId).toHaveBeenCalledWith("mp-7");
  });

  it("approved pero el ticket no existe en BD: no crashea, no envía email", async () => {
    const ticket = makeTicket({ status: "PENDING" });
    mocks.eventTicketRepository.findByExternalReference.mockResolvedValue({
      ticket,
      isAddition: false,
    });
    mocks.eventTicketRepository.applyApprovedPayment.mockResolvedValue(null);

    const handled = await tryProcessEventTicketPayment({
      externalReference: "evt_initial",
      mpPaymentId: "mp-8",
      mpStatus: "approved",
    });

    expect(handled).toBe(true);
    expect(mocks.notifyEventTicketConfirmation).not.toHaveBeenCalled();
  });
});
