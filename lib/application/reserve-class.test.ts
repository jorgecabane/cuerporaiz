import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  reserveClassUseCase,
  cancelReservationUseCase,
  cancelReservationByStaffUseCase,
  listMyReservationsPaginated,
} from "./reserve-class";
import type { Reservation, LiveClass } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  reservationRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
    findByUserIdAndCenterPaginated: vi.fn(),
    countByUserAndStatus: vi.fn(),
    hasTrialReservation: vi.fn(),
    findByUserAndLiveClass: vi.fn(),
    create: vi.fn(),
  },
  liveClassRepository: {
    findById: vi.fn(),
    countConfirmedReservations: vi.fn(),
  },
  centerRepository: { findById: vi.fn() },
  userPlanRepository: {
    findById: vi.fn(),
    decrementClassesUsed: vi.fn(),
    findActiveByUserAndCenter: vi.fn(),
    incrementClassesUsed: vi.fn(),
  },
  centerHolidayRepository: {
    findByCenterIdAndDate: vi.fn(),
  },
  userRepository: { findById: vi.fn() },
  planRepository: { findById: vi.fn() },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  reservationRepository: mocks.reservationRepository,
  userPlanRepository: mocks.userPlanRepository,
  userRepository: mocks.userRepository,
  instructorRepository: { findByCenterId: vi.fn() },
  planRepository: mocks.planRepository,
  centerHolidayRepository: mocks.centerHolidayRepository,
}));

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "res-1",
    userId: "user-1",
    liveClassId: "lc-1",
    userPlanId: "up-1",
    status: "CONFIRMED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLiveClass(overrides: { startsAt?: Date; centerId?: string } = {}): LiveClass {
  return {
    id: "lc-1",
    centerId: "center-1",
    title: "Yoga",
    startsAt: new Date("2026-06-01T14:00:00Z"),
    durationMinutes: 60,
    maxCapacity: 20,
    disciplineId: null,
    instructorId: null,
    isOnline: false,
    meetingUrl: null,
    isTrialClass: false,
    trialCapacity: null,
    color: null,
    classPassEnabled: false,
    classPassCapacity: null,
    seriesId: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("cancelReservationUseCase", () => {
  const userId = "user-1";
  const centerId = "center-1";
  const reservationId = "res-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.reservationRepository.findById.mockResolvedValue(makeReservation());
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      cancelBeforeMinutes: 12 * 60,
    });
    mocks.userPlanRepository.findById.mockResolvedValue({ id: "up-1", classesTotal: 10, classesUsed: 0 });
    mocks.reservationRepository.updateStatus.mockImplementation(
      async (_id: string, status: Reservation["status"]) => makeReservation({ status })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Caso A: cancela a tiempo (hoursBeforeClass >= cancelBeforeHours) => CANCELLED y decrementa classesUsed", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T23:00:00Z"); // 13h después
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationUseCase(userId, centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reservation.status).toBe("CANCELLED");
    }
    expect(mocks.reservationRepository.updateStatus).toHaveBeenCalledWith(
      reservationId,
      "CANCELLED"
    );
    expect(mocks.userPlanRepository.decrementClassesUsed).toHaveBeenCalledWith("up-1");
  });

  it("Caso B: cancela tarde (0 <= hoursBeforeClass < cancelBeforeHours) => LATE_CANCELLED y NO decrementa", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T14:00:00Z"); // 4h después ( < 12 )
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationUseCase(userId, centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reservation.status).toBe("LATE_CANCELLED");
    }
    expect(mocks.reservationRepository.updateStatus).toHaveBeenCalledWith(
      reservationId,
      "LATE_CANCELLED"
    );
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });

  it("Caso C: clase ya inició (hoursBeforeClass < 0) => success: false, code CLASS_STARTED", async () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const startsAt = new Date("2026-06-01T11:00:00Z"); // 1h antes
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationUseCase(userId, centerId, reservationId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("CLASS_STARTED");
      expect(result.message).toMatch(/ya inició/);
    }
    expect(mocks.reservationRepository.updateStatus).not.toHaveBeenCalled();
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });
});

describe("cancelReservationByStaffUseCase", () => {
  const centerId = "center-1";
  const reservationId = "res-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.reservationRepository.findById.mockResolvedValue(makeReservation());
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      cancelBeforeMinutes: 12 * 60,
    });
    mocks.userPlanRepository.findById.mockResolvedValue({ id: "up-1", classesTotal: 10, classesUsed: 0 });
    mocks.reservationRepository.updateStatus.mockImplementation(
      async (_id: string, status: Reservation["status"]) => makeReservation({ status })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Caso A: cancela a tiempo => CANCELLED y decrementa", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T23:00:00Z");
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationByStaffUseCase(centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) expect(result.reservation.status).toBe("CANCELLED");
    expect(mocks.userPlanRepository.decrementClassesUsed).toHaveBeenCalledWith("up-1");
  });

  it("Caso B: cancela tarde => LATE_CANCELLED y NO decrementa", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T14:00:00Z");
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationByStaffUseCase(centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) expect(result.reservation.status).toBe("LATE_CANCELLED");
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });

  it("Caso C: clase ya inició => CLASS_STARTED", async () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const startsAt = new Date("2026-06-01T11:00:00Z");
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationByStaffUseCase(centerId, reservationId);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("CLASS_STARTED");
    expect(mocks.reservationRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe("listMyReservationsPaginated", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reservationRepository.findByUserIdAndCenterPaginated.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it("sin statuses no pasa statuses al repo (todas las reservas)", async () => {
    await listMyReservationsPaginated(userId, centerId, { page: 1, pageSize: 10 });

    expect(mocks.reservationRepository.findByUserIdAndCenterPaginated).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        centerId,
        limit: 10,
        offset: 0,
      })
    );
    const call = mocks.reservationRepository.findByUserIdAndCenterPaginated.mock.calls[0][1];
    expect(call.statuses).toBeUndefined();
  });

  it("con statuses pasa array al repo (incluye CANCELLED y LATE_CANCELLED)", async () => {
    const statuses = ["CONFIRMED", "CANCELLED", "LATE_CANCELLED", "ATTENDED", "NO_SHOW"] as const;
    await listMyReservationsPaginated(userId, centerId, { page: 1, pageSize: 10, statuses: [...statuses] });

    expect(mocks.reservationRepository.findByUserIdAndCenterPaginated).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        centerId,
        limit: 10,
        offset: 0,
        statuses: ["CONFIRMED", "CANCELLED", "LATE_CANCELLED", "ATTENDED", "NO_SHOW"],
      })
    );
  });
});

describe("reserveClassUseCase — holiday blocking", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId })
    );
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      bookBeforeMinutes: 0,
      cancelBeforeMinutes: 0,
      maxNoShowsPerMonth: 10,
      allowTrialClassPerPerson: false,
    });
    mocks.reservationRepository.countByUserAndStatus.mockResolvedValue(0);
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(0);
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(null);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: null, classesUsed: 0, validUntil: null, status: "ACTIVE" },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rechaza reserva si la fecha de la clase es feriado del centro → HOLIDAY", async () => {
    mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue({
      id: "h-1",
      centerId,
      date: new Date(Date.UTC(2026, 5, 10)),
      label: "Día libre",
      createdAt: new Date(),
    });

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("HOLIDAY");
      expect(result.message).toMatch(/feriado/i);
    }
    expect(mocks.reservationRepository.create).not.toHaveBeenCalled();
  });

  it("permite reserva si no hay feriado en la fecha", async () => {
    mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue(null);
    mocks.reservationRepository.create.mockResolvedValue(makeReservation());

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.centerHolidayRepository.findByCenterIdAndDate).toHaveBeenCalled();
  });
});
