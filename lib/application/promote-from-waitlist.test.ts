import { describe, it, expect, vi, beforeEach } from "vitest";
import { promoteFromWaitlistUseCase } from "./promote-from-waitlist";

const mocks = vi.hoisted(() => ({
  centerRepository: { findById: vi.fn() },
  liveClassRepository: {
    findById: vi.fn(),
    countConfirmedReservations: vi.fn(),
  },
  eventRepository: { findById: vi.fn() },
  eventTicketRepository: {
    countPaidByEventId: vi.fn(),
    findByEventAndUser: vi.fn(),
  },
  reservationRepository: {
    countByUserAndStatus: vi.fn(),
    hasTrialReservation: vi.fn(),
    findByUserAndLiveClass: vi.fn(),
  },
  userPlanRepository: {
    findActiveByUserAndCenter: vi.fn(),
    incrementClassesUsed: vi.fn(),
  },
  planRepository: { findById: vi.fn() },
  centerHolidayRepository: { findByCenterIdAndDate: vi.fn() },
  waitlistRepository: {
    findById: vi.fn(),
    promoteToClassReservation: vi.fn(),
    promoteToEventHold: vi.fn(),
    expireEventHolds: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  eventRepository: mocks.eventRepository,
  eventTicketRepository: mocks.eventTicketRepository,
  reservationRepository: mocks.reservationRepository,
  userPlanRepository: mocks.userPlanRepository,
  planRepository: mocks.planRepository,
  centerHolidayRepository: mocks.centerHolidayRepository,
  waitlistRepository: mocks.waitlistRepository,
}));

const futureClass = {
  id: "lc_1",
  centerId: "ctr_1",
  title: "Vinyasa",
  startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  durationMinutes: 60,
  maxCapacity: 5,
  isOnline: false,
  status: "ACTIVE",
  isTrialClass: false,
};

const center = {
  id: "ctr_1",
  cancelBeforeMinutes: 720,
  bookBeforeMinutes: 60,
  maxNoShowsPerMonth: 5,
  allowTrialClassPerPerson: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.centerRepository.findById.mockResolvedValue(center);
  mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue(null);
  mocks.reservationRepository.countByUserAndStatus.mockResolvedValue(0);
  mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);
  mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(null);
});

describe("promoteFromWaitlistUseCase — clase", () => {
  it("falla si la entry no existe", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue(null);
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("NOT_FOUND");
  });

  it("falla si la entry no es del usuario", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "other",
      status: "QUEUED",
      liveClassId: "lc_1",
      eventId: null,
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("FORBIDDEN");
  });

  it("falla si la entry no se puede promover (estado terminal)", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "PROMOTED",
      liveClassId: "lc_1",
      eventId: null,
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("CANNOT_PROMOTE");
  });

  it("falla con NO_ACTIVE_PLAN si el usuario no tiene plan activo", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: "lc_1",
      eventId: null,
    });
    mocks.liveClassRepository.findById.mockResolvedValue(futureClass);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("NO_ACTIVE_PLAN");
  });

  it("retorna SPOT_TAKEN cuando la transacción detecta sobre-cupo", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: "lc_1",
      eventId: null,
    });
    mocks.liveClassRepository.findById.mockResolvedValue(futureClass);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up_1", planId: "p_1", classesTotal: 10, classesUsed: 0, status: "ACTIVE", validUntil: null },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p_1", type: "LIVE" });
    mocks.waitlistRepository.promoteToClassReservation.mockResolvedValue({
      success: false,
      reason: "spot_taken",
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("SPOT_TAKEN");
  });

  it("éxito: crea reserva y descuenta clase del plan dentro de la transacción", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: "lc_1",
      eventId: null,
    });
    mocks.liveClassRepository.findById.mockResolvedValue(futureClass);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up_1", planId: "p_1", classesTotal: 10, classesUsed: 0, status: "ACTIVE", validUntil: null },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p_1", type: "LIVE" });
    mocks.waitlistRepository.promoteToClassReservation.mockResolvedValue({
      success: true,
      reservationId: "res_1",
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(true);
    if (r.success && r.kind === "class") expect(r.reservationId).toBe("res_1");
    // El consumo del plan ocurre dentro de la transacción del adapter, vía
    // userPlanIdToConsume. El use case ya no llama incrementClassesUsed externo.
    expect(mocks.waitlistRepository.promoteToClassReservation).toHaveBeenCalledWith(
      expect.objectContaining({ userPlanIdToConsume: "up_1" })
    );
    expect(mocks.userPlanRepository.incrementClassesUsed).not.toHaveBeenCalled();
  });

  it("plan ilimitado (classesTotal=null): no consume clase", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: "lc_1",
      eventId: null,
    });
    mocks.liveClassRepository.findById.mockResolvedValue(futureClass);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up_1", planId: "p_1", classesTotal: null, classesUsed: 0, status: "ACTIVE", validUntil: null },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p_1", type: "LIVE" });
    mocks.waitlistRepository.promoteToClassReservation.mockResolvedValue({
      success: true,
      reservationId: "res_2",
    });
    await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(mocks.waitlistRepository.promoteToClassReservation).toHaveBeenCalledWith(
      expect.objectContaining({ userPlanIdToConsume: null })
    );
  });

  it("falla con BOOKING_WINDOW_CLOSED si la ventana cerró", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: "lc_1",
      eventId: null,
    });
    mocks.liveClassRepository.findById.mockResolvedValue({
      ...futureClass,
      startsAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min, < 60
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("BOOKING_WINDOW_CLOSED");
  });
});

describe("promoteFromWaitlistUseCase — evento", () => {
  const futureEvent = {
    id: "ev_1",
    centerId: "ctr_1",
    title: "Retiro",
    startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    amountCents: 50000,
    currency: "CLP",
    maxCapacity: 5,
    status: "PUBLISHED",
    location: "Centro",
  };

  it("éxito: inicia hold de 15 min", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: null,
      eventId: "ev_1",
    });
    mocks.eventRepository.findById.mockResolvedValue(futureEvent);
    const heldUntil = new Date(Date.now() + 15 * 60 * 1000);
    mocks.waitlistRepository.promoteToEventHold.mockResolvedValue({
      success: true,
      ticketId: "tk_1",
      heldUntil,
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(true);
    if (r.success && r.kind === "event") {
      expect(r.eventTicketId).toBe("tk_1");
      expect(r.heldUntil.getTime()).toBe(heldUntil.getTime());
    }
    expect(mocks.waitlistRepository.expireEventHolds).toHaveBeenCalledWith(
      "ev_1",
      expect.any(Date)
    );
  });

  it("retorna SPOT_TAKEN si el cupo se llenó antes de la transacción", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "NOTIFIED",
      liveClassId: null,
      eventId: "ev_1",
    });
    mocks.eventRepository.findById.mockResolvedValue(futureEvent);
    mocks.waitlistRepository.promoteToEventHold.mockResolvedValue({
      success: false,
      reason: "spot_taken",
    });
    const r = await promoteFromWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("SPOT_TAKEN");
  });
});
